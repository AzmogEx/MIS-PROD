import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'

export const workerStaleMilliseconds = 180_000
export const workerLongPhaseMilliseconds = 300_000
export type WorkerQueue = { jobsDue: number; jobsProcessing: number; jobsFailed: number; notificationsDue: number; notificationsProcessing: number; notificationsFailed: number; oldestDueAt: string | null }
export type WorkerObservation = {
  format: 1; source: 'mis-worker'; databaseKey: string; runID: string; status: 'running' | 'completed' | 'failed';
  startedAt: string; observedAt: string; completedAt?: string; lastSuccessAt?: string;
  phase: string; phaseStartedAt: string; activeJobID?: string | number | null; queue?: WorkerQueue; interruptedJobID?: string | number; error?: string;
}

export function workerDatabaseKey(url = process.env.DATABASE_URL || 'file:./.data/cms.db') {
  const normalized = url.startsWith('file:') ? path.resolve(url.slice(5)).replaceAll('\\', '/') : url
  return createHash('sha256').update(normalized).digest('hex')
}
export function workerHealthFile(directory = process.env.CMS_WORKER_HEALTH_DIR || '.data/health') {
  return path.resolve(directory, `worker-${workerDatabaseKey().slice(0, 16)}.json`)
}
export async function readWorkerObservation(filename = workerHealthFile()): Promise<WorkerObservation | null> {
  try {
    if ((await stat(filename)).size > 65536) return null
    const value = JSON.parse(await readFile(filename, 'utf8'))
    return value?.format === 1 && value?.source === 'mis-worker' ? value : null
  } catch { return null }
}
export async function writeWorkerObservation(value: WorkerObservation, filename = workerHealthFile()) {
  await mkdir(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${randomUUID()}.tmp`
  try { await writeFile(temporary, JSON.stringify(value), { flag: 'wx', mode: 0o600 }); await rename(temporary, filename) }
  finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }) }
}

export function inspectWorkerObservation(value: WorkerObservation | null, now = new Date(), expectedDatabase = workerDatabaseKey()) {
  if (!value || value.databaseKey !== expectedDatabase) return { healthy: false, state: 'Aucun passage observé', detail: 'Aucun journal daté correspondant à cette base. Démarrer le worker puis contrôler son premier passage.' }
  const stamp = Date.parse(value.observedAt), started = Date.parse(value.phaseStartedAt)
  if (!Number.isFinite(stamp) || !Number.isFinite(started) || stamp > now.getTime() + 60_000) return { healthy: false, state: 'Observation invalide', detail: 'Journal absent, invalide ou daté dans le futur ; vérifier l’horloge et les accès au stockage.' }
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stamp))
  if (now.getTime() - stamp > workerStaleMilliseconds) return { healthy: false, state: 'Signal de vie périmé', detail: `Dernière observation : ${date} (Europe/Paris). Aucun signal récent depuis plus de trois minutes ; vérifier le processus et ses journaux.` }
  if (value.status === 'failed') return { healthy: false, state: 'Dernier passage en échec', detail: `Échec observé le ${date} (Europe/Paris), étape ${value.phase}. ${value.error || 'Consulter le journal protégé du worker.'}` }
  if (value.status === 'running' && now.getTime() - started > workerLongPhaseMilliseconds) return { healthy: false, state: 'Traitement anormalement long', detail: `Signal reçu le ${date} (Europe/Paris), mais étape ${value.phase} inchangée depuis plus de cinq minutes. Vérifier avant toute reprise.` }
  if (!['running', 'completed'].includes(value.status)) return { healthy: false, state: 'Observation invalide', detail: 'État de worker non reconnu.' }
  if (value.status === 'completed' && value.queue?.jobsProcessing) return { healthy: false, state: 'Traitements bloqués à examiner', detail: `Passage terminé le ${date} (Europe/Paris), mais des jobs restent en traitement. Vérifier leur résultat et les processus concurrents ; aucun rejeu aveugle.` }
  const delayed = value.queue?.oldestDueAt && now.getTime() - Date.parse(value.queue.oldestDueAt) > 600_000
  const failures = (value.queue?.jobsFailed || 0) + (value.queue?.notificationsFailed || 0)
  return { healthy: true, state: value.status === 'running' ? 'Passage en cours' : failures ? 'En marche, erreurs à examiner' : delayed ? 'En marche, file en retard' : 'Dernier passage terminé', detail: `Observation : ${date} (Europe/Paris). ${failures ? 'Des traitements sont en échec ; un worker actif ne garantit pas leur réussite.' : delayed ? 'Des éléments sont échus depuis plus de dix minutes ; consulter les limites de lot, les erreurs et la file.' : 'Ce signal atteste le processus local ; il ne vérifie aucun fournisseur externe.'}` }
}

export async function workerIntegration(manager: boolean) {
  const observation = await readWorkerObservation()
  const status = inspectWorkerObservation(observation)
  const queue = manager && observation?.databaseKey === workerDatabaseKey() ? observation.queue : undefined
  const counts = queue ? ` Dernière file observée : jobs ${queue.jobsDue} échus, ${queue.jobsProcessing} en cours, ${queue.jobsFailed} en échec ; notifications ${queue.notificationsDue} échues, ${queue.notificationsProcessing} en cours, ${queue.notificationsFailed} en échec.` : ''
  return { key: 'worker', title: 'Worker et files persistantes', state: status.state, detail: status.detail + counts, ...(manager ? { href: '/admin/collections/payload-jobs' } : {}) }
}
