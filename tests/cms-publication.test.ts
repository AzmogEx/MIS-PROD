import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import sharp from 'sharp'
import { buildConfig, getPayload, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { coreCollections, siteContent } from '../src/cms/collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { defaultContent } from '../src/cms/seed-content'
import { fromPayloadContent, toPayloadContent } from '../src/cms/content-fields'
import { restoreRelease, saveEditor } from '../src/cms/editor-service'
import type { PageBlock } from '../src/cms/page-types'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { updateMediaMetadata } from '../src/cms/media-services'

test('Publications cohérentes : instantanés, restauration atomique et corbeille', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-publication-'))
  process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
  let failPageSave = false
  const failPageHook: CollectionBeforeChangeHook = ({ data }) => { if (failPageSave) throw new Error('Défaut de sauvegarde injecté après restauration des dépendances'); return data }
  const config = await buildConfig({
    onInit: installTransactionQueue, sharp,
    secret: process.env.PAYLOAD_SECRET, telemetry: false, admin: { disable: true },
    serverURL: 'http://localhost:4415', logger: { options: { level: 'fatal' } },
    typescript: { autoGenerate: false }, graphQL: { disable: true },
    localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
    collections: [...coreCollections.map(collection => collection.slug === 'pages' ? { ...collection, hooks: { ...collection.hooks, beforeChange: [...collection.hooks!.beforeChange!, failPageHook] } } : collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: path.join(directory, 'files') } } : collection), SubmissionLimits],
    globals: [siteContent], jobs: { deleteJobOnComplete: false, tasks: [] },
  })
  const cms = await getPayload({ config })
  const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { email: 'publication-owner@example.test', password: randomBytes(25).toString('hex'), name: 'Recette publications', role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const access = { user: owner, overrideAccess: false }
  const initialContent = structuredClone(defaultContent); initialContent.hero.firstVerb = 'Version globale initiale'
  await cms.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(initialContent), _status: 'published' }, ...access })
  const section = async (title: string, body: string) => cms.create({ collection: 'shared-sections', data: { title, layout: [{ blockType: 'editorial', title, body }], _status: 'published' }, ...access })
  const a = await section('Section A', 'Historique A')
  const b = await section('Section B', 'Historique B')
  const page = await cms.create({ collection: 'pages', data: { title: 'Page de recette', path: '/publication-recette', layout: [{ blockType: 'shared', section: a.id }, { blockType: 'shared', section: b.id }], _status: 'published' }, ...access })
  const pageID = Number(page.id)
  let releaseID: string | number
  const working = async () => ({ page: await cms.findByID({ collection: 'pages', id: pageID, draft: true, depth: 0, ...access }), content: await cms.findGlobal({ slug: 'site-content', draft: true, depth: 0, ...access }) })
  const publish = async () => { const current = await working(); return saveEditor(cms, owner, pageID, { pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, publish: true }) }
  const latestRelease = async () => (await cms.find({ collection: 'publication-releases', where: { page: { equals: pageID } }, sort: '-id', limit: 1, depth: 0, ...access })).docs[0]
  const shared = (id: string | number, draft: boolean) => cms.findByID({ collection: 'shared-sections', id, draft, depth: 0, ...access })
  const body = (doc: unknown) => (doc as { layout: PageBlock[] }).layout[0].body
  const snapshotState = async () => ({
    working: await working(), a: await shared(a.id, true), b: await shared(b.id, true),
    aVersions: (await cms.countVersions({ collection: 'shared-sections', where: { parent: { equals: a.id } }, ...access })).totalDocs,
    bVersions: (await cms.countVersions({ collection: 'shared-sections', where: { parent: { equals: b.id } }, ...access })).totalDocs,
    pageVersions: (await cms.countVersions({ collection: 'pages', where: { parent: { equals: pageID } }, ...access })).totalDocs,
    globalVersions: (await cms.findGlobalVersions({ slug: 'site-content', limit: 1, ...access })).totalDocs,
  })
  try {
    await t.test('la mise à la corbeille retire une page publique', async () => {
      const probe = await cms.create({ collection: 'pages', data: { title: 'Corbeille de recette', path: '/corbeille-recette', layout: [], _status: 'published' }, ...access })
      const deletedAt = new Date().toISOString()
      await cms.update({ collection: 'pages', id: probe.id, data: { deletedAt }, ...access })
      assert.equal((await cms.findByID({ collection: 'pages', id: probe.id, trash: true })).deletedAt, deletedAt)
      await assert.rejects(cms.findByID({ collection: 'pages', id: probe.id, overrideAccess: false }))
    })
    await t.test('la publication fige les sections publiques, sans publier un autre brouillon', async () => {
      await cms.update({ collection: 'shared-sections', id: a.id, data: { layout: [{ blockType: 'editorial', body: 'Brouillon A non autorisé à la publication' }], _status: 'draft' }, draft: true, ...access })
      await publish()
      const release = await latestRelease(); releaseID = release.id
      const snapshot = release.pageSnapshot as { _dependencies: { format: number; sharedSections: Array<{ id: string | number; layout: PageBlock[] }> } }
      assert.equal(snapshot._dependencies.format, 1)
      assert.equal(snapshot._dependencies.sharedSections.length, 2)
      assert.equal(snapshot._dependencies.sharedSections.find(item => item.id === a.id)!.layout[0].body, 'Historique A')
      assert.equal(body(await shared(a.id, false)), 'Historique A')
      assert.equal(body(await shared(a.id, true)), 'Brouillon A non autorisé à la publication')
    })

    await t.test('restauration : aperçu historique cohérent, public et autres brouillons non publiés', async () => {
      for (const item of [a, b]) await cms.update({ collection: 'shared-sections', id: item.id, data: { layout: [{ blockType: 'editorial', body: `Public récent ${item.id}` }], _status: 'published' }, ...access })
      const live = structuredClone(initialContent); live.hero.firstVerb = 'Version globale publique récente'
      await cms.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(live), _status: 'published' }, ...access })
      await cms.update({ collection: 'pages', id: pageID, data: { layout: [{ blockType: 'editorial', body: 'Composition publique récente' }], _status: 'published' }, ...access })
      const restored = await restoreRelease(cms, owner, releaseID)
      assert.equal(restored.restoredSections.length, 2)
      assert.equal(body(await shared(a.id, true)), 'Historique A'); assert.equal(body(await shared(b.id, true)), 'Historique B')
      assert.equal(body(await shared(a.id, false)), `Public récent ${a.id}`)
      const preview = await cms.findByID({ collection: 'pages', id: pageID, draft: true, depth: 3, ...access })
      assert.equal(body(preview.layout[0].section), 'Historique A')
      assert.equal(body(preview.layout[1].section), 'Historique B')
      assert.equal((await cms.findByID({ collection: 'pages', id: pageID, draft: false, depth: 0, overrideAccess: false })).layout[0].body, 'Composition publique récente')
      assert.equal(fromPayloadContent(await cms.findGlobal({ slug: 'site-content', draft: false })).hero.firstVerb, 'Version globale publique récente')
      assert.equal(fromPayloadContent(restored.content).hero.firstVerb, 'Version globale initiale')
    })

    await t.test('publier la page restaurée conserve les sections actuellement publiques et capture leurs versions', async () => {
      await publish()
      const release = await latestRelease()
      assert.equal((release.pageSnapshot as { _dependencies: { sharedSections: Array<{ layout: PageBlock[] }> } })._dependencies.sharedSections[0].layout[0].body, `Public récent ${a.id}`)
      assert.equal(body(await shared(a.id, true)), 'Historique A')
      assert.equal(body(await shared(a.id, false)), `Public récent ${a.id}`)
      const publicPage = await cms.findByID({ collection: 'pages', id: pageID, draft: false, depth: 3, overrideAccess: false })
      assert.equal(body(publicPage.layout[0].section), `Public récent ${a.id}`)
    })

    await t.test('une section jamais publiée ou une ancienne publication sans dépendances échoue sans mutation', async () => {
      const draft = await cms.create({ collection: 'shared-sections', data: { title: 'Section inédite', layout: [{ blockType: 'editorial', body: 'Interne' }], _status: 'draft' }, draft: true, ...access })
      const current = await working(); const before = await snapshotState()
      await assert.rejects(saveEditor(cms, owner, pageID, { pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, layout: [{ blockType: 'shared', section: Number(draft.id) }], publish: true }), /publiée explicitement/)
      assert.deepEqual(await snapshotState(), before)
      const release = await cms.findByID({ collection: 'publication-releases', id: releaseID, depth: 0, ...access })
      const oldSnapshot = { ...release.pageSnapshot }; delete oldSnapshot._dependencies
      const old = await cms.create({ collection: 'publication-releases', data: { title: 'Ancien instantané de recette', page: pageID, pageSnapshot: oldSnapshot, contentSnapshot: release.contentSnapshot, actor: owner.id }, overrideAccess: true })
      await assert.rejects(restoreRelease(cms, owner, old.id), /ancienne publication/)
      assert.deepEqual(await snapshotState(), before)
    })

    await t.test('dépendance supprimée et panne après ses écritures : restauration entièrement annulée', async () => {
      await cms.update({ collection: 'shared-sections', id: a.id, data: { layout: [{ blockType: 'editorial', body: 'Brouillon A à conserver' }], _status: 'draft' }, draft: true, ...access })
      await cms.update({ collection: 'shared-sections', id: b.id, data: { deletedAt: new Date().toISOString() }, ...access })
      const beforeA = await shared(a.id, true); const beforeWorking = await working()
      const beforeVersions = await cms.countVersions({ collection: 'shared-sections', where: { parent: { equals: a.id } } })
      await assert.rejects(restoreRelease(cms, owner, releaseID))
      assert.deepEqual(await shared(a.id, true), beforeA); assert.deepEqual(await working(), beforeWorking)
      assert.equal((await cms.countVersions({ collection: 'shared-sections', where: { parent: { equals: a.id } } })).totalDocs, beforeVersions.totalDocs)
      await cms.update({ collection: 'shared-sections', id: b.id, trash: true, data: { deletedAt: null, _status: 'published' }, ...access })
      const before = await snapshotState()
      failPageSave = true
      try { await assert.rejects(restoreRelease(cms, owner, releaseID), /Défaut de sauvegarde/) } finally { failPageSave = false }
      assert.deepEqual(await snapshotState(), before, 'Les versions de sections, du global et de page doivent aussi être annulées')
    })

    await t.test('publications et médiathèque simultanées : conflit contrôlé, écritures durables après rollback', async () => {
      const before = await snapshotState()
      await assert.rejects(restoreRelease(cms, owner, releaseID, { dependencyUpdatedAt: { [String(a.id)]: '2000-01-01T00:00:00.000Z' } }), /CONFLICT/)
      assert.deepEqual(await snapshotState(), before)
      const current = await working()
      const releasesBefore = (await cms.count({ collection: 'publication-releases' })).totalDocs
      const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#c9a961' } }).png().toBuffer()
      const media = await cms.create({ collection: 'media', data: { alt: 'Média concurrent initial' }, file: { data: image, name: 'concurrent.png', mimetype: 'image/png', size: image.length }, ...access })
      const attempts = await Promise.allSettled([
        ...['Version concurrente A', 'Version concurrente B'].map(value => saveEditor(cms, owner, pageID, { pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, layout: [{ blockType: 'editorial', body: value }], publish: true })),
        updateMediaMetadata(cms, owner, { ids: [media.id], patch: { credit: 'Crédit concurrent conservé' }, revisions: { [String(media.id)]: media.updatedAt } }),
      ])
      assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 2)
      assert.equal(attempts.filter(item => item.status === 'rejected').length, 1)
      assert.equal(attempts[2].status, 'fulfilled')
      const currentMedia = await cms.findByID({ collection: 'media', id: media.id, depth: 0, ...access })
      await updateMediaMetadata(cms, owner, { ids: [media.id], patch: { alt: 'Média durable après conflit' }, revisions: { [String(media.id)]: currentMedia.updatedAt } })
      const disk = new DatabaseSync(path.join(directory, 'cms.db'))
      const stored = disk.prepare("SELECT media_locales.alt, media.credit FROM media JOIN media_locales ON media_locales._parent_id = media.id WHERE media.id = ? AND media_locales._locale = 'fr'").get(Number(media.id)); disk.close()
      assert.equal(stored?.credit, 'Crédit concurrent conservé')
      assert.equal(stored?.alt, 'Média durable après conflit')
      assert.equal((await cms.count({ collection: 'publication-releases' })).totalDocs, releasesBefore + 1)
      const published = await cms.findByID({ collection: 'pages', id: pageID, draft: false, depth: 0, overrideAccess: false })
      const captured = (await latestRelease()).pageSnapshot as { layout: PageBlock[] }
      assert.equal(published.layout[0].body, captured.layout[0].body)
    })

    await t.test('publication native et programmation capturent global et dépendances publiques sans publier leurs brouillons', async () => {
      const nativeSection = await section('Section native', 'Section publiée avant programmation')
      const native = await cms.create({ collection: 'pages', data: { title: 'Publication native', path: '/publication-native', layout: [{ blockType: 'shared', section: nativeSection.id }], _status: 'draft' }, draft: true, ...access })
      const publicGlobal = await cms.findGlobal({ slug: 'site-content', draft: false, depth: 0 })
      const globalDraft = fromPayloadContent(publicGlobal); globalDraft.hero.firstVerb = 'Brouillon global non autorisé par la programmation'
      await cms.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(globalDraft), _status: 'draft' }, draft: true, ...access })
      await cms.update({ collection: 'shared-sections', id: nativeSection.id, data: { layout: [{ blockType: 'editorial', body: 'Brouillon partagé non autorisé' }], _status: 'draft' }, draft: true, ...access })
      const releaseForNative = async () => (await cms.find({ collection: 'publication-releases', where: { page: { equals: native.id } }, sort: '-id', limit: 1 })).docs[0]
      await cms.update({ collection: 'pages', id: native.id, data: { _status: 'published' }, select: { title: true }, ...access })
      let nativeRelease = await releaseForNative()
      assert.ok(nativeRelease)
      assert.equal(fromPayloadContent(nativeRelease.contentSnapshot).hero.firstVerb, fromPayloadContent(publicGlobal).hero.firstVerb)
      assert.equal((nativeRelease.pageSnapshot as { _dependencies: { sharedSections: Array<{ layout: PageBlock[] }> } })._dependencies.sharedSections[0].layout[0].body, 'Section publiée avant programmation')
      await cms.update({ collection: 'pages', id: native.id, data: { layout: [{ blockType: 'shared', section: nativeSection.id }, { blockType: 'editorial', body: 'Planification réelle' }], _status: 'draft' }, draft: true, ...access })
      const before = (await cms.count({ collection: 'publication-releases', where: { page: { equals: native.id } } })).totalDocs
      const job = await cms.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: String(native.id) }, user: { relationTo: 'users', value: owner.id } }, waitUntil: new Date(Date.now() - 1000) })
      await cms.jobs.run({ limit: 10 })
      assert.ok((await cms.findByID({ collection: 'payload-jobs', id: job.id })).completedAt)
      assert.equal((await cms.count({ collection: 'publication-releases', where: { page: { equals: native.id } } })).totalDocs, before + 1)
      nativeRelease = await releaseForNative()
      assert.equal((nativeRelease.pageSnapshot as { layout: PageBlock[] }).layout[1].body, 'Planification réelle')
      assert.equal(fromPayloadContent(nativeRelease.contentSnapshot).hero.firstVerb, fromPayloadContent(publicGlobal).hero.firstVerb)
      assert.equal(body(await shared(nativeSection.id, true)), 'Brouillon partagé non autorisé')
      await cms.jobs.run({ limit: 10 })
      assert.equal((await cms.count({ collection: 'publication-releases', where: { page: { equals: native.id } } })).totalDocs, before + 1, 'Un job terminé ne crée pas une deuxième publication')
      await cms.update({ collection: 'shared-sections', id: nativeSection.id, data: { layout: [{ blockType: 'editorial', body: 'Public partagé plus récent' }], _status: 'published' }, ...access })
      await restoreRelease(cms, owner, nativeRelease.id)
      assert.equal(body(await shared(nativeSection.id, true)), 'Section publiée avant programmation')
      assert.equal(body(await shared(nativeSection.id, false)), 'Public partagé plus récent')
      assert.equal(fromPayloadContent(await cms.findGlobal({ slug: 'site-content', draft: false })).hero.firstVerb, fromPayloadContent(publicGlobal).hero.firstVerb)
      const neverPublished = await cms.create({ collection: 'shared-sections', data: { title: 'Dépendance native invalide', layout: [], _status: 'draft' }, draft: true, ...access })
      const saved = await cms.findByID({ collection: 'pages', id: native.id, draft: false })
      await assert.rejects(cms.update({ collection: 'pages', id: native.id, data: { layout: [{ blockType: 'shared', section: neverPublished.id }], _status: 'published' }, ...access }), /publiée/)
      assert.deepEqual(await cms.findByID({ collection: 'pages', id: native.id, draft: false }), saved)
    })

    await t.test('une publication planifiée, une sauvegarde ou une restauration ne ressuscite pas la corbeille', async () => {
      const current = await working()
      const job = await cms.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: String(pageID) }, user: { relationTo: 'users', value: owner.id } }, waitUntil: new Date(Date.now() - 1000) })
      const deletedAt = new Date().toISOString()
      const trashed = await cms.update({ collection: 'pages', id: pageID, data: { deletedAt }, ...access })
      assert.equal(trashed.deletedAt, deletedAt, 'La mutation de corbeille doit être persistée')
      const disk = new DatabaseSync(path.join(directory, 'cms.db'))
      const diskRow = disk.prepare('SELECT deleted_at FROM pages WHERE id = ?').get(pageID); disk.close()
      assert.equal(diskRow?.deleted_at, deletedAt, 'La ligne SQLite brute doit conserver la corbeille')
      assert.equal((await cms.findByID({ collection: 'pages', id: pageID, trash: true, draft: false })).deletedAt, deletedAt, 'La page doit être effectivement dans la corbeille avant le job')
      const contentBefore = await cms.findGlobal({ slug: 'site-content', draft: true })
      await cms.jobs.run({ limit: 10 })
      assert.equal((await cms.findByID({ collection: 'pages', id: pageID, trash: true, draft: false })).deletedAt, deletedAt)
      await assert.rejects(cms.findByID({ collection: 'pages', id: pageID, overrideAccess: false }))
      const run = await cms.findByID({ collection: 'payload-jobs', id: job.id })
      assert.ok(!run.completedAt)
      await assert.rejects(saveEditor(cms, owner, pageID, { pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, publish: true }))
      await assert.rejects(restoreRelease(cms, owner, releaseID))
      assert.deepEqual(await cms.findGlobal({ slug: 'site-content', draft: true }), contentBefore)
    })
  } finally {
    (cms.db as unknown as { client?: { close: () => void } }).client?.close(); await cms.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => { /* Windows may briefly retain an isolated SQLite handle. */ })
  }
})
