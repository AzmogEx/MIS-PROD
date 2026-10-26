/** Operator-only acceptance data for the isolated Coolify preproduction.
 * Credentials stay outside public storage. No messages or production writes. */
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { getCMS } from '../src/cms/payload'
import { saveEditor, restoreRelease } from '../src/cms/editor-service'
import { getAuthorizedPrivateFile } from '../src/cms/client-services'

assert.equal(process.env.CMS_DEPLOYMENT_ENVIRONMENT, 'preproduction')
assert.equal(process.env.CMS_EMAIL_DELIVERY, 'disabled')
assert.equal(process.env.CMS_AUTH_EMAIL_DELIVERY, 'disabled')
const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!)
assert.equal(origin.protocol, 'https:')
assert.ok(!['mis-prod.fr', 'www.mis-prod.fr'].includes(origin.hostname))
const phase = process.argv[2]
const filename = '.cms/preproduction-access.json'
const cms = await getCMS()
try {
  if (phase === 'seed') {
    assert.equal((await cms.count({ collection: 'users' })).totalDocs, 0, 'Bootstrap only on an empty isolated target')
    const account = (email: string) => ({ email, password: randomBytes(32).toString('base64url') })
    const ownerAccount = account('recette-owner@example.test'), aliceAccount = account('recette-client@example.test'), bobAccount = account('recette-refus@example.test')
    const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { ...ownerAccount, name: 'Propriétaire MIS — recette', role: 'owner' } }), collection: 'users' as const }
    // Persist owner access before subsequent optional fixture operations.
    await mkdir('.cms', { recursive: true })
    await writeFile(filename, JSON.stringify({ origin: origin.origin, owner: ownerAccount, alice: aliceAccount, bob: bobAccount, ownerID: owner.id }), { mode: 0o600, flag: 'wx' })
    const alice = await cms.create({ collection: 'users', user: owner, data: { ...aliceAccount, name: 'RECETTE-MIS Client autorisé', role: 'client' } })
    const bob = await cms.create({ collection: 'users', user: owner, data: { ...bobAccount, name: 'RECETTE-MIS Accès inadéquat', role: 'client' } })
    const bytes = await readFile('public/hero.mp4')
    const video = await cms.create({ collection: 'media', user: owner, file: { data: bytes, size: bytes.length, name: 'recette-mis-film.mp4', mimetype: 'video/mp4' }, data: { alt: 'RECETTE-MIS — copie du film historique pour essai technique', visibility: 'public' } })
    const page = await cms.create({ collection: 'pages', user: owner, data: { title: 'RECETTE-MIS Préproduction', path: '/recette-mis', seo: { noindex: true }, _status: 'published', layout: [{ blockType: 'editorial', title: 'RECETTE-MIS Version A', body: 'Données synthétiques de recette. Publication A.', media: video.id }] } })
    const project = await cms.create({ collection: 'projects', user: owner, data: { title: 'RECETTE-MIS Projet vidéo', members: [alice.id], status: 'review' } })
    const file = await cms.create({ collection: 'private-files', user: owner, file: { data: bytes, size: bytes.length, name: 'recette-mis-prive-v1.mp4', mimetype: 'video/mp4' }, data: { title: 'RECETTE-MIS Vidéo privée', project: project.id } })
    const delivery = await cms.create({ collection: 'deliverables', user: owner, data: { title: 'RECETTE-MIS Film', project: project.id, version: 'V1', file: file.id, duration: 15.44, clientVisible: true } })
    const manifest = { origin: origin.origin, owner: ownerAccount, alice: aliceAccount, bob: bobAccount, ownerID: owner.id, aliceID: alice.id, bobID: bob.id, pageID: page.id, projectID: project.id, fileID: file.id, deliveryID: delivery.id, mediaID: video.id, videoBytes: bytes.length, videoHash: createHash('sha256').update(bytes).digest('hex') }
    await writeFile(filename, JSON.stringify(manifest, null, 2), { mode: 0o600 })
    console.log(JSON.stringify({ seeded: true, pageID: page.id, projectID: project.id, deliveryID: delivery.id, mediaID: video.id, videoBytes: bytes.length, accessFile: filename }))
  } else {
    const fixture = JSON.parse(await readFile(filename, 'utf8'))
    const login = await cms.login({ collection: 'users', data: fixture.owner })
    const owner = { ...login.user!, collection: 'users' as const }
    const access = { user: owner, overrideAccess: false }
    if (['draft', 'publish', 'unpublish', 'schedule'].includes(phase)) {
      const page = await cms.findByID({ collection: 'pages', id: fixture.pageID, draft: true, depth: 0, ...access })
      const content = await cms.findGlobal({ slug: 'site-content', draft: true, depth: 0, ...access })
      if (phase === 'draft') await saveEditor(cms, owner, fixture.pageID, { pageUpdatedAt: page.updatedAt, contentUpdatedAt: content.updatedAt, layout: [{ blockType: 'editorial', title: 'RECETTE-MIS Version B', body: 'RECETTE-MIS BROUILLON B', media: fixture.mediaID }], publish: false })
      if (phase === 'publish') await saveEditor(cms, owner, fixture.pageID, { pageUpdatedAt: page.updatedAt, contentUpdatedAt: content.updatedAt, publish: true })
      if (phase === 'unpublish') await cms.update({ collection: 'pages', id: fixture.pageID, data: { _status: 'draft' }, ...access })
      if (phase === 'schedule') {
        const job = await cms.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: String(fixture.pageID) }, user: { relationTo: 'users', value: owner.id } }, waitUntil: new Date(Date.now() + 10000) })
        fixture.jobID = job.id
        await writeFile(filename, JSON.stringify(fixture, null, 2), { mode: 0o600 })
      }
      console.log(JSON.stringify({ phase, pageID: fixture.pageID, jobID: fixture.jobID }))
    } else if (phase === 'restore') {
      const release = (await cms.find({ collection: 'publication-releases', where: { page: { equals: fixture.pageID } }, sort: 'id', limit: 1, depth: 0, ...access })).docs[0]
      assert.ok(release)
      await restoreRelease(cms, owner, release.id)
      console.log(JSON.stringify({ restoredDraft: true, releaseID: release.id }))
    } else if (phase === 'probe') {
      const alice = { ...await cms.findByID({ collection: 'users', id: fixture.aliceID }), collection: 'users' as const }
      const bob = { ...await cms.findByID({ collection: 'users', id: fixture.bobID }), collection: 'users' as const }
      await getAuthorizedPrivateFile(cms, fixture.fileID, alice)
      await assert.rejects(getAuthorizedPrivateFile(cms, fixture.fileID, bob))
      const media = await cms.findByID({ collection: 'media', id: fixture.mediaID, depth: 0 })
      const hash = createHash('sha256').update(await readFile((process.env.CMS_MEDIA_DIR || '.data/media') + '/' + media.filename)).digest('hex')
      assert.equal(hash, fixture.videoHash)
      const page = await cms.findByID({ collection: 'pages', id: fixture.pageID, draft: false, depth: 0 })
      const draft = await cms.findByID({ collection: 'pages', id: fixture.pageID, draft: true, depth: 0 })
      const job = fixture.jobID ? await cms.findByID({ collection: 'payload-jobs', id: fixture.jobID, depth: 0 }) : null
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ownerLogin: true, pages: (await cms.count({ collection: 'pages' })).totalDocs, users: (await cms.count({ collection: 'users' })).totalDocs, privateACL: 'member-only', videoHash: hash, publicTitle: page.layout[0]?.title, draftTitle: draft.layout[0]?.title, jobCompleted: Boolean(job?.completedAt), versions: (await cms.countVersions({ collection: 'pages', where: { parent: { equals: fixture.pageID } } })).totalDocs }))
    } else throw new Error('Expected seed, draft, publish, unpublish, schedule, restore or probe')
  }
} finally { await cms.destroy() }
