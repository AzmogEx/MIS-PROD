import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { getPayload } from 'payload'
import { requireLatestMigrationSnapshot } from '../scripts/cms-migrate-state.mjs'

test('Le snapshot final ne génère aucun SQL redondant, sans connexion à une base', async () => {
  process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
  process.env.CMS_SCHEMA_PUSH = 'false'
  process.env.CMS_AUTH_EMAIL_DELIVERY = 'disabled'
  const directory = path.resolve('src/migrations')
  const filename = await requireLatestMigrationSnapshot(directory)
  assert.ok(filename)
  const snapshot = JSON.parse(await readFile(path.join(directory, filename), 'utf8'))
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config, key: randomUUID(), disableDBConnect: true, disableOnInit: true })
  try {
    const { generateDrizzleJson, generateMigration } = payload.db.requireDrizzleKit()
    const current = await generateDrizzleJson(payload.db.schema)
    assert.deepEqual(await generateMigration(snapshot, current), [])
  } finally { await payload.destroy() }
})

test('La génération refuse une migration manuelle sans snapshot final et accepte une baseline complète', async () => {
  const directory = path.resolve('.data/tests/snapshot-guard-' + randomUUID())
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, '20261025_100000_initial.ts'), '// fixture')
  await writeFile(path.join(directory, '20261025_100000_initial.json'), JSON.stringify({ dialect: 'sqlite', version: '6', tables: {} }))
  await writeFile(path.join(directory, '20261025_110000_manual.ts'), '// fixture')
  await assert.rejects(requireLatestMigrationSnapshot(directory), /ne possède pas de snapshot/)
  await writeFile(path.join(directory, '20261025_110000_manual.json'), JSON.stringify({ dialect: 'sqlite', version: '6', tables: {} }))
  assert.equal(await requireLatestMigrationSnapshot(directory), '20261025_110000_manual.json')
})
