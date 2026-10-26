import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { buildConfig, getPayload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { operationCollections } from '../../src/cms/operation-collections'
import { installTransactionQueue } from '../../src/cms/transaction-queue'
import type { MailTransport } from '../../src/cms/operations'

export function fixtureRoot() {
  const root = path.resolve(process.env.CMS_TEST_ROOT || '')
  if (!root.startsWith(path.resolve('.data/tests') + path.sep)) throw new Error('Répertoire isolé de recette requis.')
  return root
}
export async function fixturePayload(push = false) {
  await mkdir(fixtureRoot(), { recursive: true })
  return getPayload({ key: randomUUID(), config: buildConfig({
    secret: process.env.PAYLOAD_SECRET!, telemetry: false, admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false }, onInit: async payload => installTransactionQueue(payload),
    db: sqliteAdapter({ client: { url: process.env.DATABASE_URL! }, push, wal: true, busyTimeout: 10000, transactionOptions: { behavior: 'immediate' } }),
    collections: [
      { slug: 'users', auth: true, fields: [{ name: 'role', type: 'text' }, { name: 'name', type: 'text' }] },
      { slug: 'pages', trash: true, versions: { drafts: { schedulePublish: true } }, fields: [{ name: 'title', type: 'text' }] },
      { slug: 'test-effects', fields: [{ name: 'key', type: 'text', unique: true, required: true }] }, ...operationCollections,
    ],
    jobs: { deleteJobOnComplete: false, tasks: [
      { slug: 'fixtureWait', inputSchema: [{ name: 'key', type: 'text' }], handler: async ({ req, input }) => {
        if (process.env.CMS_TEST_WORKER_MODE === 'hang-job') { await writeFile(path.join(fixtureRoot(), 'job-started'), 'ready'); await new Promise(resolve => setTimeout(resolve, 3600000)) }
        await req.payload.create({ collection: 'test-effects', data: { key: String(input.key) } }); return { output: {} }
      } },
      { slug: 'fixtureComplete', inputSchema: [{ name: 'key', type: 'text' }], handler: async ({ req, input }) => { await req.payload.create({ collection: 'test-effects', data: { key: String(input.key) } }); return { output: {} } } },
    ] },
  }) })
}
export const fixtureTransport: MailTransport = { send: async mail => {
  const filename = path.join(fixtureRoot(), 'provider.json')
  let accepted: string[] = []
  try { accepted = JSON.parse(await readFile(filename, 'utf8')) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  if (!accepted.includes(mail.dedupeKey)) { accepted.push(mail.dedupeKey); await writeFile(filename, JSON.stringify(accepted)) }
  if (process.env.CMS_TEST_WORKER_MODE === 'hang-mail') { await writeFile(path.join(fixtureRoot(), 'mail-accepted'), 'ready'); await new Promise(resolve => setTimeout(resolve, 3600000)) }
  return { providerId: 'fixture-idempotent-acceptance', captured: true }
} }
