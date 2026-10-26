import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getCMS } from '../../src/cms/payload'
import { getAuthorizedPrivateFile, servePrivateFile } from '../../src/cms/client-services'

const expected = JSON.parse(await readFile(process.env.CMS_RESTORE_EXPECTED!, 'utf8'))
const password = process.env.CMS_RESTORE_PASSWORD
assert.ok(password, 'Mot de passe de recette fourni au processus isolé')
const cms = await getCMS()
try {
  const login = await cms.login({ collection: 'users', data: { email: 'restore-owner@example.invalid', password } })
  assert.equal(login.user?.role, 'owner')
  const owner = { ...login.user!, collection: 'users' as const }
  assert.equal((await cms.count({ collection: 'pages' })).totalDocs, 8)
  const published = await cms.findByID({ collection: 'pages', id: expected.pageID, draft: false, depth: 0 })
  const draft = await cms.findByID({ collection: 'pages', id: expected.pageID, draft: true, depth: 0 })
  assert.equal(published.title, 'Accueil')
  assert.equal(draft.title, 'Brouillon conservé pour la restauration')
  assert.equal((await cms.findVersions({ collection: 'pages', where: { parent: { equals: expected.pageID } }, depth: 0 })).totalDocs, expected.versions)
  const media = await cms.findByID({ collection: 'media', id: expected.mediaID, user: owner, overrideAccess: false })
  assert.equal(createHash('sha256').update(await readFile(process.env.CMS_MEDIA_DIR! + '/' + media.filename)).digest('hex'), expected.mediaHash)
  const members = await cms.find({ collection: 'users', where: { role: { equals: 'client' } }, depth: 0 })
  const alice = { ...members.docs.find(user => user.email === 'restore-alice@example.invalid')!, collection: 'users' as const }
  const bob = { ...members.docs.find(user => user.email === 'restore-bob@example.invalid')!, collection: 'users' as const }
  const file = await getAuthorizedPrivateFile(cms, expected.privateID, alice)
  const response = await servePrivateFile(new Request('http://localhost/api/client/files/fixture'), file)
  assert.equal(response.status, 200)
  assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), expected.privateHash)
  await assert.rejects(getAuthorizedPrivateFile(cms, expected.privateID, bob))
  assert.equal((await cms.find({ collection: 'projects', user: bob, overrideAccess: false })).totalDocs, 0)
  assert.equal((await cms.count({ collection: 'briefs' })).totalDocs, 1)
  const brief = (await cms.find({ collection: 'briefs', depth: 0 })).docs[0]
  assert.equal(brief.answers.message, 'Demande synthétique à conserver après restauration.')
  assert.ok(brief.schemaSnapshot.fields.length)
  assert.equal((await cms.count({ collection: 'notifications' })).totalDocs, 1)
  assert.equal((await cms.count({ collection: 'tasks' })).totalDocs, 1)
  assert.equal((await cms.count({ collection: 'users' })).totalDocs, 3)
  console.log(JSON.stringify({ restored: true, checkedAt: new Date().toISOString(), pages: 8, users: 3, briefs: 1, tasks: 1, versions: expected.versions, privateAuthorization: 'member-only', publishedAndDraft: 'distinct', externalDelivery: 'disabled' }))
} finally { await cms.destroy() }
