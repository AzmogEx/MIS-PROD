/** Operator-only acceptance data for the isolated Coolify preproduction.
 * Credentials stay outside public storage. No messages or production writes. */
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { getCMS } from '../src/cms/payload'
import { saveEditor, restoreRelease } from '../src/cms/editor-service'
import { getAuthorizedPrivateFile, servePrivateFile } from '../src/cms/client-services'

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
    if (phase === 'http') {
      const authenticate = async (data: { email: string; password: string }) => {
        const response = await fetch(new URL('/api/users/login', origin), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin.origin }, body: JSON.stringify(data), signal: AbortSignal.timeout(20000) })
        assert.equal(response.status, 200)
        const result = await response.json()
        assert.ok(result.token)
        return { Authorization: `JWT ${result.token}`, Origin: origin.origin }
      }
      const alice = await authenticate(fixture.alice), bob = await authenticate(fixture.bob)
      const fileURL = new URL(`/api/client/files/${fixture.fileID}`, origin)
      const allowed = await fetch(fileURL, { headers: { ...alice, Range: 'bytes=0-1023' } })
      assert.equal(allowed.status, 206)
      assert.equal((await allowed.arrayBuffer()).byteLength, 1024)
      const denied = await fetch(fileURL, { headers: bob })
      assert.ok([401, 403, 404].includes(denied.status))
      const publicMedia = await cms.findByID({ collection: 'media', id: fixture.mediaID, depth: 0 })
      const range = await fetch(new URL(publicMedia.url!, origin), { headers: { Range: 'bytes=1048576-1049599' } })
      assert.equal(range.status, 206)
      assert.equal((await range.arrayBuffer()).byteLength, 1024)
      const workspace = await (await fetch(new URL('/api/client', origin), { headers: alice })).json()
      const excluded = await (await fetch(new URL('/api/client', origin), { headers: bob })).json()
      assert.equal(workspace.projects.length, 1)
      assert.equal(workspace.portfolios.length, 1)
      assert.equal(excluded.projects.length, 0)
      assert.equal(excluded.portfolios.length, 0)
      const ownerHeaders = await authenticate(fixture.owner)
      const form = new FormData()
      form.set('_payload', JSON.stringify({ alt: 'RECETTE-MIS Format volontairement non pris en charge', visibility: 'public' }))
      form.set('file', new Blob(['RECETTE-MIS unsupported format'], { type: 'video/quicktime' }), 'recette-mis-refus.mov')
      const unsupported = await fetch(new URL('/api/media', origin), { method: 'POST', headers: ownerHeaders, body: form })
      assert.ok([400, 415].includes(unsupported.status))
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), https: true, privateRange: allowed.status, privateDenied: denied.status, publicRange: range.status, rangeBytes: 1024, unsupportedFormat: unsupported.status, memberProjects: workspace.projects.length, memberSelections: workspace.portfolios.length, excludedProjects: excluded.projects.length, excludedSelections: excluded.portfolios.length }))
    } else if (phase === 'rotate-access') {
      // Local server operation restricted to these three synthetic accounts.
      // Payload revokes sessions on password changes; verify that behavior.
      const identities = [['owner', fixture.ownerID, 'recette-owner@example.test'], ['alice', fixture.aliceID, 'recette-client@example.test'], ['bob', fixture.bobID, 'recette-refus@example.test']] as const
      for (const [, id, email] of identities) assert.equal((await cms.findByID({ collection: 'users', id, depth: 0 })).email, email)
      for (const [key, id] of identities) {
        const password = randomBytes(32).toString('base64url')
        await cms.update({ collection: 'users', id, data: { password }, ...access })
        fixture[key].password = password
        await writeFile(filename, JSON.stringify(fixture, null, 2), { mode: 0o600 })
        assert.equal((await cms.findByID({ collection: 'users', id, depth: 0 })).sessions?.length || 0, 0)
      }
      assert.equal((await cms.auth({ headers: new Headers({ Authorization: `JWT ${login.token}` }) })).user, null)
      console.log('Trois mots de passe remplacés et sessions révoquées. Consulter le fichier privé depuis Coolify, sans le copier dans la conversation.')
    } else if (phase === 'prepare-portal') {
      assert.ok(!fixture.portfolioID, 'Selection already prepared')
      const portfolio = await cms.create({ collection: 'commercial-portfolios', ...access, data: { title: 'RECETTE-MIS Sélection privée', introduction: 'Sélection synthétique réservée au client de recette. Les médias commerciaux seront ajoutés par MIS après vérification de leurs droits.', members: [fixture.aliceID], expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), items: [] } })
      fixture.portfolioID = portfolio.id
      await writeFile(filename, JSON.stringify(fixture, null, 2), { mode: 0o600 })
      console.log(JSON.stringify({ portfolioID: portfolio.id, items: 0, rightsDecision: 'pending-user' }))
    } else if (['draft', 'publish', 'unpublish', 'schedule'].includes(phase)) {
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
      const privateFile = await getAuthorizedPrivateFile(cms, fixture.fileID, alice)
      const privateResponse = await servePrivateFile(new Request('http://localhost/api/client/files/fixture'), privateFile)
      assert.equal(privateResponse.status, 200)
      assert.equal(createHash('sha256').update(Buffer.from(await privateResponse.arrayBuffer())).digest('hex'), fixture.videoHash)
      await assert.rejects(getAuthorizedPrivateFile(cms, fixture.fileID, bob))
      const media = await cms.findByID({ collection: 'media', id: fixture.mediaID, depth: 0 })
      const hash = createHash('sha256').update(await readFile((process.env.CMS_MEDIA_DIR || '.data/media') + '/' + media.filename)).digest('hex')
      assert.equal(hash, fixture.videoHash)
      const page = await cms.findByID({ collection: 'pages', id: fixture.pageID, draft: false, depth: 0 })
      const draft = await cms.findByID({ collection: 'pages', id: fixture.pageID, draft: true, depth: 0 })
      const job = fixture.jobID ? await cms.findByID({ collection: 'payload-jobs', id: fixture.jobID, depth: 0 }) : null
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ownerLogin: true, pages: (await cms.count({ collection: 'pages' })).totalDocs, users: (await cms.count({ collection: 'users' })).totalDocs, briefs: (await cms.count({ collection: 'briefs' })).totalDocs, tasks: (await cms.count({ collection: 'tasks' })).totalDocs, comments: (await cms.count({ collection: 'video-comments' })).totalDocs, approvals: (await cms.count({ collection: 'approvals' })).totalDocs, privateACL: 'member-only', videoHash: hash, publicTitle: page.layout[0]?.title, draftTitle: draft.layout[0]?.title, jobCompleted: Boolean(job?.completedAt), versions: (await cms.countVersions({ collection: 'pages', where: { parent: { equals: fixture.pageID } } })).totalDocs }))
    } else throw new Error('Expected seed, draft, publish, unpublish, schedule, restore, probe, http, prepare-portal or rotate-access')
  }
} finally { await cms.destroy() }
