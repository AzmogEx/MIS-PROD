import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fixturePayload } from './fixtures/worker-config'
import { inspectWorkerObservation, readWorkerObservation, workerDatabaseKey, workerHealthFile, type WorkerObservation } from '../src/cms/worker-health'
import { seedOperations, submitBrief } from '../src/cms/operations'

function child(mode = 'normal', health = false) {
  const process = spawn(globalThis.process.execPath, ['--import', 'tsx', health ? 'scripts/cms-worker-health.ts' : 'tests/fixtures/worker-process.ts'], { cwd: globalThis.process.cwd(), env: { ...globalThis.process.env, CMS_TEST_WORKER_MODE: mode }, windowsHide: true })
  let output = ''
  process.stdout.on('data', chunk => { output += chunk }); process.stderr.on('data', chunk => { output += chunk })
  const done = new Promise<{ code: number | null; output: string }>((resolve, reject) => { process.once('error', reject); process.once('close', code => resolve({ code, output })) })
  return { process, done }
}
async function waitFor(filename: string) {
  const until = Date.now() + 30000
  while (Date.now() < until) { try { await stat(filename); return } catch { await new Promise(resolve => setTimeout(resolve, 100)) } }
  throw new Error('Le processus de recette n’a pas atteint la phase attendue.')
}

test('Santé worker : absence, mauvaise base, péremption, traitement long et erreur restent explicites', () => {
  const now = new Date('2026-10-26T12:00:00Z')
  const report: WorkerObservation = { format: 1, source: 'mis-worker', databaseKey: 'test', runID: 'test', status: 'completed', startedAt: now.toISOString(), phase: 'completed', phaseStartedAt: now.toISOString(), observedAt: now.toISOString() }
  assert.equal(inspectWorkerObservation(null, now, 'test').healthy, false)
  assert.equal(inspectWorkerObservation(report, now, 'other').healthy, false)
  assert.equal(inspectWorkerObservation(report, now, 'test').healthy, true)
  assert.match(inspectWorkerObservation({ ...report, observedAt: '2026-10-26T11:55:00Z' }, now, 'test').state, /périmé/)
  assert.match(inspectWorkerObservation({ ...report, status: 'running', phase: 'jobs', phaseStartedAt: '2026-10-26T11:50:00Z' }, now, 'test').state, /long/)
  assert.match(inspectWorkerObservation({ ...report, status: 'failed' }, now, 'test').state, /échec/)
  assert.equal(inspectWorkerObservation({ ...report, observedAt: '2030-01-01T00:00:00Z' }, now, 'test').healthy, false)
  assert.equal(inspectWorkerObservation({ ...report, queue: { jobsDue: 0, jobsProcessing: 1, jobsFailed: 0, notificationsDue: 0, notificationsProcessing: 0, notificationsFailed: 0, oldestDueAt: null } }, now, 'test').healthy, false)
})

test('Worker réel : processus interrompu, reprise datée, file non bloquée et effet fournisseur dédupliqué', async t => {
  const directory = path.resolve('.data/tests/worker-process-' + randomUUID())
  await mkdir(directory, { recursive: true })
  Object.assign(process.env, { CMS_TEST_ROOT: directory, DATABASE_URL: 'file:' + path.join(directory, 'worker.db').replaceAll('\\', '/'), PAYLOAD_SECRET: randomBytes(48).toString('hex'), CMS_WORKER_HEALTH_DIR: path.join(directory, 'health'), CMS_BRIEF_FILES_DIR: path.join(directory, 'brief-files'), CMS_RETENTION_ENABLED: 'disabled', CMS_EMAIL_DELIVERY: 'disabled', CMS_AUTH_EMAIL_DELIVERY: 'disabled' })
  const payload = await fixturePayload(true)
  try {
    await t.test('arrêt forcé pendant un job : état incertain conservé, autre job exécuté, aucun rejeu terminé', async () => {
      const uncertain = await payload.jobs.queue({ task: 'fixtureWait', input: { key: 'never-replay-uncertain' } })
      const following = await payload.jobs.queue({ task: 'fixtureComplete', input: { key: 'one-effect' } })
      const running = child('hang-job')
      try {
        await waitFor(path.join(directory, 'job-started'))
        assert.equal((await payload.findByID({ collection: 'payload-jobs', id: uncertain.id })).processing, true)
        const observed = await readWorkerObservation()
        assert.equal(observed?.activeJobID, uncertain.id)
        const duplicate = await child().done
        assert.equal(duplicate.code, 0, duplicate.output); assert.match(duplicate.output, /"skipped":true/)
        assert.equal((await readWorkerObservation())?.runID, observed?.runID)
      } finally { running.process.kill('SIGKILL'); await running.done }
      const resumed = await child().done
      assert.equal(resumed.code, 0, resumed.output)
      const interrupted = await payload.findByID({ collection: 'payload-jobs', id: uncertain.id })
      assert.equal(interrupted.hasError, true); assert.equal(interrupted.processing, false)
      assert.match(JSON.stringify(interrupted.error), /résultat incertain/)
      assert.ok((await payload.findByID({ collection: 'payload-jobs', id: following.id })).completedAt)
      assert.equal((await payload.count({ collection: 'test-effects' })).totalDocs, 1)
      assert.equal((await child().done).code, 0)
      assert.equal((await payload.count({ collection: 'test-effects' })).totalDocs, 1)
      const observation = await readWorkerObservation()
      assert.equal(observation?.databaseKey, workerDatabaseKey())
      assert.equal(observation?.queue?.jobsFailed, 1)
      assert.equal(observation?.status, 'completed')
      assert.match(inspectWorkerObservation(observation).state, /erreurs/)
    })
    await t.test('restauration sans journal de santé : job incertain signalé, file débloquée sans rejeu', async () => {
      const uncertain = await payload.jobs.queue({ task: 'fixtureWait', input: { key: 'restored-uncertain-never-replay' } })
      await payload.update({ collection: 'payload-jobs', id: uncertain.id, data: { processing: true }, overrideAccess: true })
      const following = await payload.jobs.queue({ task: 'fixtureComplete', input: { key: 'restored-next-one-effect' } })
      await unlink(workerHealthFile())
      const resumed = await child().done
      assert.equal(resumed.code, 0, resumed.output)
      const restored = await payload.findByID({ collection: 'payload-jobs', id: uncertain.id })
      assert.equal(restored.processing, false); assert.equal(restored.hasError, true)
      assert.match(JSON.stringify(restored.error), /résultat incertain/)
      assert.ok((await payload.findByID({ collection: 'payload-jobs', id: following.id })).completedAt)
      assert.equal((await payload.count({ collection: 'test-effects', where: { key: { equals: 'restored-uncertain-never-replay' } } })).totalDocs, 0)
      assert.equal((await payload.count({ collection: 'test-effects', where: { key: { equals: 'restored-next-one-effect' } } })).totalDocs, 1)
      assert.equal((await readWorkerObservation())?.queue?.jobsProcessing, 0)
    })
    await t.test('acceptation email suivie d’un kill : reprise avec même clé après expiration du bail, aucune deuxième acceptation', async () => {
      await seedOperations(payload)
      await submitBrief(payload, { idempotencyKey: randomUUID(), rateKey: 'worker-fixture', body: { answers: { universe: 'entreprises', name: 'Recette worker', email: 'fixture@example.invalid', message: 'Texte synthétique de recette isolée.' } } })
      const running = child('hang-mail')
      try { await waitFor(path.join(directory, 'mail-accepted')) }
      finally { running.process.kill('SIGKILL'); await running.done }
      assert.equal((await payload.count({ collection: 'briefs' })).totalDocs, 1)
      const mail = (await payload.find({ collection: 'notifications', depth: 0 })).docs[0]
      assert.equal(mail.state, 'processing')
      // Simulate elapsed lease time after a real process kill, without waiting a minute.
      await payload.update({ collection: 'notifications', id: mail.id, data: { leaseUntil: new Date(0).toISOString() }, overrideAccess: true })
      const resumed = await child().done
      assert.equal(resumed.code, 0, resumed.output)
      assert.equal((await payload.findByID({ collection: 'notifications', id: mail.id })).state, 'captured')
      assert.equal(JSON.parse(await readFile(path.join(directory, 'provider.json'), 'utf8')).length, 1)
      assert.equal((await child().done).code, 0)
      assert.equal(JSON.parse(await readFile(path.join(directory, 'provider.json'), 'utf8')).length, 1)
      const health = await child('normal', true).done
      assert.equal(health.code, 0, health.output)
      assert.match(health.output, /"observedAt":"/)
      assert.ok((await stat(workerHealthFile())).size > 0)
    })
  } finally { await payload.destroy() }
})
