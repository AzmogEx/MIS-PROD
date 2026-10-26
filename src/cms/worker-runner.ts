import { hostname } from 'node:os'
import { randomUUID } from 'node:crypto'
import { createLocalReq, type Payload, type Where } from 'payload'
import { enqueueDueReminders } from './calendar'
import { processNotificationOutbox, type MailTransport } from './operations'
import { purgeExpiredBriefUploads } from './brief-files'
import { applyRetention } from './retention'
import { readWorkerObservation, workerDatabaseKey, workerHealthFile, workerStaleMilliseconds, writeWorkerObservation, type WorkerObservation, type WorkerQueue } from './worker-health'

function livingProcess(pid: number) { try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH' } }

async function acquireLease(payload: Payload, runID: string) {
  const prefix = `worker:${workerDatabaseKey()}:`, owner = `${hostname()}|${process.pid}|${runID}`, key = prefix + owner
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Transaction de verrouillage du worker indisponible.')
  const req = await createLocalReq({}, payload); req.transactionID = transactionID
  try {
    const leases = await payload.find({ collection: 'submission-limits', where: { key: { contains: prefix } }, limit: 25, depth: 0, req, overrideAccess: true })
    let active = false
    for (const lease of leases.docs) {
      const [host, pid] = String(lease.key).slice(prefix.length).split('|')
      const deadHere = host === hostname() && /^\d+$/.test(pid) && !livingProcess(Number(pid))
      if (Date.parse(String(lease.expiresAt)) <= Date.now() || deadHere) {
        await payload.delete({ collection: 'submission-limits', id: lease.id, req, overrideAccess: true })
      } else active = true
    }
    if (active || leases.hasNextPage) { await payload.db.commitTransaction(transactionID); return null }
    await payload.create({ collection: 'submission-limits', data: { key, expiresAt: new Date(Date.now() + workerStaleMilliseconds).toISOString() }, req, overrideAccess: true })
    await payload.db.commitTransaction(transactionID)
    return { key }
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}

const jobsDue = (now: string): Where => ({ and: [{ completedAt: { exists: false } }, { processing: { equals: false } }, { hasError: { not_equals: true } }, { or: [{ waitUntil: { exists: false } }, { waitUntil: { less_than_equal: now } }] }] })
export async function observeWorkerQueue(payload: Payload): Promise<WorkerQueue> {
  const now = new Date().toISOString()
  const notificationDue: Where = { and: [{ state: { equals: 'pending' } }, { nextAttemptAt: { less_than_equal: now } }] }
  const count = async (collection: string, where: Where) => (await payload.count({ collection, where, overrideAccess: true })).totalDocs
  const [due, processing, failed, notices, noticeProcessing, noticeFailed, oldJob, oldNotice] = await Promise.all([
    count('payload-jobs', jobsDue(now)), count('payload-jobs', { and: [{ processing: { equals: true } }, { completedAt: { exists: false } }] }), count('payload-jobs', { and: [{ hasError: { equals: true } }, { completedAt: { exists: false } }] }),
    count('notifications', notificationDue), count('notifications', { state: { equals: 'processing' } }), count('notifications', { state: { equals: 'failed' } }),
    payload.find({ collection: 'payload-jobs', where: jobsDue(now), sort: 'waitUntil', limit: 1, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'notifications', where: notificationDue, sort: 'nextAttemptAt', limit: 1, depth: 0, overrideAccess: true }),
  ])
  const dates = [oldJob.docs[0]?.waitUntil || oldJob.docs[0]?.createdAt, oldNotice.docs[0]?.nextAttemptAt].filter(value => value && Number.isFinite(Date.parse(String(value)))).map(String).sort()
  return { jobsDue: due, jobsProcessing: processing, jobsFailed: failed, notificationsDue: notices, notificationsProcessing: noticeProcessing, notificationsFailed: noticeFailed, oldestDueAt: dates[0] || null }
}

/** Runs one bounded pass. The lease protects the sole worker; an uncertain job
 * outcome is recorded for human reconciliation, never republished automatically. */
export async function runWorkerCycle(payload: Payload, options: { healthFile?: string; transport?: MailTransport } = {}) {
  const healthFile = options.healthFile || workerHealthFile(), previous = await readWorkerObservation(healthFile), runID = randomUUID()
  const lease = await acquireLease(payload, runID)
  if (!lease) return { skipped: true, reason: 'Un autre passage possède un bail actif.' }
  const now = new Date().toISOString()
  const report: WorkerObservation = { format: 1, source: 'mis-worker', databaseKey: workerDatabaseKey(), runID, status: 'running', startedAt: now, observedAt: now, phase: 'startup', phaseStartedAt: now, ...(previous?.databaseKey === workerDatabaseKey() && previous.lastSuccessAt ? { lastSuccessAt: previous.lastSuccessAt } : {}) }
  let writes = Promise.resolve(), heartbeatFailure: unknown
  const observe = () => {
    const snapshot = { ...report, observedAt: new Date().toISOString() }
    writes = writes.then(async () => {
      const renewed = await payload.update({ collection: 'submission-limits', where: { key: { equals: lease.key } }, data: { expiresAt: new Date(Date.now() + workerStaleMilliseconds).toISOString() }, overrideAccess: true })
      if (renewed.docs.length !== 1) throw new Error('Bail worker perdu ; passage interrompu.')
      await writeWorkerObservation(snapshot, healthFile)
    })
    return writes
  }
  const phase = async (name: string, jobID?: string | number) => { if (heartbeatFailure) throw heartbeatFailure; report.phase = name; report.phaseStartedAt = new Date().toISOString(); report.activeJobID = jobID ?? null; await observe() }
  const timer = setInterval(() => { void observe().catch(error => { heartbeatFailure = error }) }, 15_000)
  timer.unref()
  try {
    await observe()
    // The database, not the health file, is the durable source for uncertain jobs.
    // This remains recoverable after a second crash or restoration without health files.
    // All job execution must use this sole worker; do not launch native jobs in parallel.
    await phase('reconciliation')
    const recovered = await payload.update({ collection: 'payload-jobs', where: { and: [{ processing: { equals: true } }, { completedAt: { exists: false } }] }, data: { processing: false, hasError: true, error: { name: 'InterruptedWorker', message: 'Worker interrompu : résultat incertain. Vérifier le contenu et son historique avant de programmer une nouvelle publication. Aucun renvoi automatique.' } }, overrideAccess: true })
    if (recovered.docs.length) report.interruptedJobID = recovered.docs[0].id
    await phase('schedules'); await payload.jobs.handleSchedules({ allQueues: true })
    const ready = await payload.find({ collection: 'payload-jobs', where: jobsDue(new Date().toISOString()), limit: 20, sort: 'createdAt', depth: 0, overrideAccess: true })
    for (const job of ready.docs) { await phase('jobs', job.id); await payload.jobs.runByID({ id: job.id }) }
    await phase('reminders'); const reminders = await enqueueDueReminders(payload)
    await phase('notifications'); const notifications = await processNotificationOutbox(payload, options.transport)
    await phase('brief-files'); const abandonedBriefFiles = await purgeExpiredBriefUploads(payload)
    await phase('retention'); const retention = await applyRetention(payload, { apply: true })
    await phase('queue'); report.queue = await observeWorkerQueue(payload)
    report.status = 'completed'; report.completedAt = new Date().toISOString(); report.lastSuccessAt = report.completedAt; report.phase = 'completed'; report.activeJobID = null
    await observe()
    return { skipped: false, at: report.completedAt, jobsConsidered: ready.docs.length, reminders, notifications, abandonedBriefFiles, retention, queue: report.queue, ...(report.interruptedJobID ? { interruptedJobID: report.interruptedJobID } : {}) }
  } catch (error) {
    report.status = 'failed'; report.completedAt = new Date().toISOString(); report.error = `Échec à l’étape ${report.phase}. Consulter les journaux protégés ; les éléments persistés sont conservés.`
    await writes.catch(() => undefined)
    await writeWorkerObservation({ ...report, observedAt: new Date().toISOString() }, healthFile)
    throw error
  } finally {
    clearInterval(timer)
    await writes.catch(() => undefined)
    await payload.delete({ collection: 'submission-limits', where: { key: { equals: lease.key } }, overrideAccess: true })
  }
}
