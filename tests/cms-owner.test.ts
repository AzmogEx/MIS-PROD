import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { spawn } from 'node:child_process'
import test from 'node:test'

function run(args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), env, windowsHide: true })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk }); child.stderr.on('data', chunk => { output += chunk })
    child.once('error', reject); child.once('close', code => resolve({ code, output }))
  })
}

test('Premier propriétaire CLI : base migrée, secret non journalisé, concurrence et traitements réservés aux managers', async () => {
  const root = path.resolve('.data/tests/owner-' + randomUUID())
  await mkdir(root, { recursive: true })
  const password = randomBytes(36).toString('base64url'), email = `owner-${randomUUID()}@example.invalid`
  const database = path.join(root, 'owner.db'), competing = path.join(root, 'competing.db')
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', CMS_SCHEMA_PUSH: 'false', DATABASE_URL: 'file:' + database.replaceAll('\\', '/'), PAYLOAD_SECRET: randomBytes(48).toString('hex'), CMS_OWNER_EMAIL: email, CMS_OWNER_PASSWORD: password, CMS_AUTH_EMAIL_DELIVERY: 'disabled', CMS_EMAIL_DELIVERY: 'disabled', CMS_BROWSER_ANALYTICS: 'disabled', CMS_RETENTION_ENABLED: 'disabled', CMS_PRIVATE_FILES_DIR: path.join(root, 'private'), CMS_MEDIA_DIR: path.join(root, 'media'), CMS_BRIEF_FILES_DIR: path.join(root, 'brief-files') }
  const migration = await run(['scripts/cms-migrate.mjs'], env)
  assert.equal(migration.code, 0, migration.output)
  const before = new DatabaseSync(database)
  try { assert.equal(before.prepare('SELECT count(*) n FROM users').get()?.n, 0); before.exec(`VACUUM INTO '${competing.replaceAll("'", "''")}'`) } finally { before.close() }
  const invalid = await run(['--import', 'tsx', 'scripts/cms-owner.ts'], { ...env, CMS_OWNER_PASSWORD: 'too-short' })
  assert.notEqual(invalid.code, 0); assert.ok(!invalid.output.includes(password))
  const created = await run(['--import', 'tsx', 'scripts/cms-owner.ts'], env)
  assert.equal(created.code, 0, created.output)
  assert.match(created.output, /Compte propriétaire créé/)
  assert.ok(!created.output.includes(password)); assert.ok(!created.output.includes(email))
  const repeated = await run(['--import', 'tsx', 'scripts/cms-owner.ts'], env)
  assert.notEqual(repeated.code, 0); assert.match(repeated.output, /Des comptes existent/)
  assert.ok(!repeated.output.includes(password))
  const race = await Promise.all([run(['--import', 'tsx', 'scripts/cms-owner.ts'], { ...env, DATABASE_URL: 'file:' + competing.replaceAll('\\', '/') }), run(['--import', 'tsx', 'scripts/cms-owner.ts'], { ...env, DATABASE_URL: 'file:' + competing.replaceAll('\\', '/'), CMS_OWNER_EMAIL: `second-${randomUUID()}@example.invalid`, CMS_OWNER_PASSWORD: randomBytes(36).toString('base64url') })])
  assert.equal(race.filter(result => result.code === 0).length, 1)
  const raceDB = new DatabaseSync(competing, { readOnly: true })
  try { assert.equal(raceDB.prepare('SELECT count(*) n FROM users WHERE role=\'owner\'').get()?.n, 1) } finally { raceDB.close() }
  assert.equal((await readFile(database)).includes(Buffer.from(password)), false)
  Object.assign(process.env, env)
  const { getCMS } = await import('../src/cms/payload')
  const payload = await getCMS()
  try {
    const login = await payload.login({ collection: 'users', data: { email, password } })
    assert.ok(login.user)
    assert.equal(login.user.role, 'owner')
    const owner = { ...login.user, collection: 'users' as const }
    assert.equal(payload.config.collections.find(collection => collection.slug === 'payload-jobs')?.admin.hidden, false)
    await payload.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: '123456' } }, waitUntil: new Date(Date.now() + 86400000) })
    assert.equal((await payload.find({ collection: 'payload-jobs', user: owner, overrideAccess: false })).totalDocs, 1)
    assert.equal((await payload.find({ collection: 'payload-jobs', user: { ...owner, role: 'admin' }, overrideAccess: false })).totalDocs, 1)
    for (const role of ['client', 'sales', 'editor', 'contributor']) await assert.rejects(payload.find({ collection: 'payload-jobs', user: { ...owner, role }, overrideAccess: false }))
    const job = (await payload.find({ collection: 'payload-jobs', depth: 0 })).docs[0]
    await assert.rejects(payload.update({ collection: 'payload-jobs', id: job.id, user: owner, overrideAccess: false, data: { processing: false } }))
  } finally { await payload.destroy() }
})
