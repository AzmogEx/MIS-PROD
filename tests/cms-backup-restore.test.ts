import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { backupAndVerify } from '../src/cms/backup'

function run(args: string[], env: NodeJS.ProcessEnv, cwd: string) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk }); child.stderr.on('data', chunk => { output += chunk })
    child.once('error', reject); child.once('close', code => resolve({ code, output }))
  })
}

test('Sauvegarde représentative : application relancée sur restauration, brouillon, fichiers et droits conservés', async () => {
  const original = process.cwd(), root = path.resolve('.data/tests/restore-application-' + randomUUID())
  const password = randomBytes(36).toString('base64url')
  await mkdir(path.join(root, '.data'), { recursive: true })
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', CMS_SCHEMA_PUSH: 'false', DATABASE_URL: 'file:' + path.join(root, '.data/cms.db').replaceAll('\\', '/'), PAYLOAD_SECRET: randomBytes(48).toString('hex'), NEXT_PUBLIC_SITE_URL: 'http://localhost:3999', CMS_AUTH_EMAIL_DELIVERY: 'disabled', CMS_EMAIL_DELIVERY: 'disabled', CMS_BROWSER_ANALYTICS: 'disabled', CMS_RETENTION_ENABLED: 'disabled', CMS_SEARCH_CONSOLE: 'disabled', CMS_PRIVATE_FILES_DIR: path.join(root, '.cms/private'), CMS_MEDIA_DIR: path.join(root, '.data/media'), CMS_BRIEF_FILES_DIR: path.join(root, '.data/brief-files'), MEDIA_IMPORT_ROOT: path.join(root, '.data/media-imports'), CMS_SEARCH_CONSOLE_DIR: path.join(root, '.data/search-console') }
  const migrated = await run(['scripts/cms-migrate.mjs'], env, original)
  assert.equal(migrated.code, 0, migrated.output)
  Object.assign(process.env, env)
  const [{ getCMS }, { seedCMS }, { submitBrief }, { default: sharp }] = await Promise.all([import('../src/cms/payload'), import('../scripts/cms-seed'), import('../src/cms/operations'), import('sharp')])
  const cms = await getCMS()
  let expected: Record<string, unknown>
  try {
    assert.deepEqual(await seedCMS(cms), { created: 8, existing: 0 })
    const owner = { ...await cms.create({ collection: 'users', data: { email: 'restore-owner@example.invalid', password, name: 'Propriétaire de recette', role: 'owner' }, context: { bootstrap: true } }), collection: 'users' as const }
    const makeClient = async (name: string) => cms.create({ collection: 'users', data: { email: `restore-${name}@example.invalid`, password: randomBytes(30).toString('hex'), name: 'Client de recette ' + name, role: 'client' }, user: owner, overrideAccess: false })
    const alice = await makeClient('alice'); await makeClient('bob')
    const home = (await cms.find({ collection: 'pages', where: { path: { equals: '/' } }, depth: 0 })).docs[0]
    await cms.update({ collection: 'pages', id: home.id, draft: true, data: { title: 'Brouillon conservé pour la restauration' }, user: owner, overrideAccess: false })
    const versions = (await cms.findVersions({ collection: 'pages', where: { parent: { equals: home.id } }, depth: 0 })).totalDocs
    const data = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#c9a961' } }).png().toBuffer()
    const media = await cms.create({ collection: 'media', data: { alt: 'Image synthétique de restauration', visibility: 'public' }, file: { data, name: 'restauration.png', mimetype: 'image/png', size: data.length }, user: owner, overrideAccess: false })
    const project = await cms.create({ collection: 'projects', data: { title: 'Projet synthétique de restauration', members: [alice.id], status: 'review' }, user: owner, overrideAccess: false })
    const file = await cms.create({ collection: 'private-files', data: { title: 'Livrable synthétique de restauration', project: project.id, kind: 'delivery' }, file: { data, name: 'livrable.png', mimetype: 'image/png', size: data.length }, user: owner, overrideAccess: false })
    await cms.create({ collection: 'deliverables', data: { title: 'Livrable de restauration', project: project.id, version: 'V1', file: file.id, clientVisible: true }, user: owner, overrideAccess: false })
    await submitBrief(cms, { body: { answers: { universe: 'entreprises', name: 'Demande de recette', email: 'restore-brief@example.invalid', message: 'Demande synthétique à conserver après restauration.', organization: 'Recette isolée' } }, idempotencyKey: randomUUID(), rateKey: randomUUID() })
    await cms.create({ collection: 'tasks', data: { title: 'Rappel synthétique de restauration', assignee: owner.id, dueAt: new Date(Date.now() + 86400000).toISOString(), state: 'open', notifyAssignee: false }, user: owner, overrideAccess: false })
    expected = { pageID: home.id, versions, mediaID: media.id, privateID: file.id, mediaHash: createHash('sha256').update(await readFile(path.join(env.CMS_MEDIA_DIR!, String(media.filename)))).digest('hex'), privateHash: createHash('sha256').update(await readFile(path.join(env.CMS_PRIVATE_FILES_DIR!, String(file.filename)))).digest('hex') }
  } finally { await cms.destroy() }
  await cp(path.join(original, 'public'), path.join(root, 'public'), { recursive: true })
  for (const name of ['.env.example', 'package-lock.json', 'src/payload.config.ts']) { await mkdir(path.dirname(path.join(root, name)), { recursive: true }); await cp(path.join(original, name), path.join(root, name)) }
  await writeFile(path.join(root, '.env.local'), `PAYLOAD_SECRET=${env.PAYLOAD_SECRET}\nCMS_EMAIL_DELIVERY=disabled\nCMS_AUTH_EMAIL_DELIVERY=disabled\n`, { mode: 0o600 })
  let backup: Awaited<ReturnType<typeof backupAndVerify>>
  try { process.chdir(root); backup = await backupAndVerify() } finally { process.chdir(original) }
  const restore = path.join(root, '.data/restore-checks', backup.backupID)
  const expectedFile = path.join(root, 'expected.json'); await writeFile(expectedFile, JSON.stringify(expected))
  const restored = await run(['--import', 'tsx', 'tests/fixtures/restore-probe.ts'], { ...env, DATABASE_URL: 'file:' + path.join(restore, 'cms.db').replaceAll('\\', '/'), CMS_MEDIA_DIR: path.join(restore, 'files/.data/media'), CMS_PRIVATE_FILES_DIR: path.join(restore, 'files/.cms/private'), CMS_BRIEF_FILES_DIR: path.join(restore, 'files/.data/brief-files'), MEDIA_IMPORT_ROOT: path.join(restore, 'files/.data/media-imports'), CMS_SEARCH_CONSOLE_DIR: path.join(restore, 'files/.data/search-console'), CMS_RESTORE_EXPECTED: expectedFile, CMS_RESTORE_PASSWORD: password }, original)
  assert.equal(restored.code, 0, restored.output)
  const proof = { backup, restoration: JSON.parse(restored.output.trim().split('\n').find(line => line.startsWith('{"restored"'))!), source: path.relative(original, root), application: 'new node process, same source revision, restored SQLite and restored file roots' }
  await writeFile(path.join(root, 'proof.json'), JSON.stringify(proof, null, 2))
  console.log(JSON.stringify(proof))
})
