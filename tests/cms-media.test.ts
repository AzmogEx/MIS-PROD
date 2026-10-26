import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { buildConfig, getPayload, handleEndpoints, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { coreCollections, siteContent } from '../src/cms/collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { defaultContent } from '../src/cms/seed-content'
import { toPayloadContent, fromPayloadContent } from '../src/cms/content-fields'
import { getMediaUsage, mediaRightsDeadline, mediaReferences, replaceMediaReferences, updateMediaMetadata, validateMediaFile, storageObservation, MediaError, type LibraryMedia } from '../src/cms/media-services'
import { importPublicMedia } from '../scripts/cms-import-media'
import { installTransactionQueue } from '../src/cms/transaction-queue'

test('Les échéances de droits suivent Europe/Paris en hiver et en été', () => {
  assert.equal(mediaRightsDeadline('2026-01-15'), '2026-01-15T22:59:59.999Z')
  assert.equal(mediaRightsDeadline('2026-07-15'), '2026-07-15T21:59:59.999Z')
  assert.equal(mediaRightsDeadline('2026-03-29'), '2026-03-29T21:59:59.999Z')
  assert.equal(mediaRightsDeadline('2026-10-25'), '2026-10-25T22:59:59.999Z')
  assert.throws(() => mediaRightsDeadline('2026-02-30'), MediaError)
})

test('Médiathèque : fichiers réels, usages, droits et remplacement transactionnel', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-media-'))
  const files = path.join(directory, 'files')
  const config = await buildConfig({
    secret: randomBytes(48).toString('hex'), onInit: installTransactionQueue, telemetry: false, admin: { disable: true }, sharp,
    serverURL: 'http://localhost:4413', typescript: { autoGenerate: false }, graphQL: { disable: true },
    localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'media.db').replaceAll('\\', '/')}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
    collections: [...coreCollections.map(collection => collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: files } } : collection), SubmissionLimits],
    globals: [siteContent],
  })
  const payload = await getPayload({ config })
  const password = randomBytes(30).toString('hex')
  const owner = { ...await payload.create({ collection: 'users', context: { bootstrap: true }, data: { email: 'media-owner@example.test', name: 'Recette médias', password, role: 'owner' }, overrideAccess: true }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const client = { ...await payload.create({ collection: 'users', data: { email: 'media-client@example.test', name: 'Client de recette', password: randomBytes(30).toString('hex'), role: 'client' }, user: owner, overrideAccess: false }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const data = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#c9a961' } }).png().toBuffer()
  const makeFile = (name: string) => ({ data, name, mimetype: 'image/png', size: data.length })
  let original: LibraryMedia; let next: LibraryMedia; let pageID: number; let releaseID: number
  try {
    const login = await payload.login({ collection: 'users', data: { email: 'media-owner@example.test', password } })
    const authHeaders = { Authorization: `JWT ${login.token}` }
    await t.test('import REST multipart réel, variantes web et restriction par défaut', async () => {
      const form = new FormData(); form.append('file', new Blob([new Uint8Array(data)], { type: 'image/png' }), 'original.png'); form.append('_payload', JSON.stringify({ alt: 'Image de recette originale', collection: 'Recette' }))
      const response = await handleEndpoints({ config, request: new Request('http://localhost:4413/api/media', { method: 'POST', headers: authHeaders, body: form }) })
      const json = await response.json()
      assert.equal(response.status, 201, JSON.stringify(json))
      original = json.doc as LibraryMedia
      assert.equal(original.visibility, 'restricted')
      assert.equal(original.width, 1600); assert.equal(original.height, 1200)
      assert.ok(original.sizes?.card?.url); assert.ok(original.sizes?.mobile?.url)
      assert.ok((await stat(path.join(files, original.filename!))).size)
      next = await payload.create({ collection: 'media', file: makeFile('version-2.png'), data: { alt: 'Nouvelle version de recette' }, user: owner, overrideAccess: false }) as LibraryMedia
      const subtitles = new FormData(); subtitles.append('file', new Blob(['WEBVTT\n\n00:00.000 --> 00:01.000\nSous-titre de recette\n'], { type: 'text/vtt' }), 'captions.vtt'); subtitles.append('_payload', JSON.stringify({ alt: 'Sous-titres de recette' }))
      const captions = await handleEndpoints({ config, request: new Request('http://localhost:4413/api/media', { method: 'POST', headers: authHeaders, body: subtitles }) })
      assert.equal(captions.status, 201, await captions.text())
      const storage = await storageObservation(payload)
      assert.equal(storage.available, true)
      if (storage.available) { assert.ok(storage.bytes >= data.length * 2); assert.ok(storage.files >= 4) }
    })

    await t.test('permissions REST et signatures réelles, pas de document privé publiquement lisible', async () => {
      const response = await handleEndpoints({ config, request: new Request(`http://localhost:4413/api/media/${original.id}`) })
      assert.ok([403, 404].includes(response.status)); await response.arrayBuffer()
      const file = await handleEndpoints({ config, request: new Request(new URL(original.url!, config.serverURL)) })
      assert.ok([403, 404].includes(file.status)); await file.arrayBuffer()
      await assert.rejects(getMediaUsage(payload, client, Number(original.id)), error => error instanceof MediaError && error.status === 403)
      await assert.rejects(payload.create({ collection: 'media', file: makeFile('interdit.png'), data: { alt: 'Interdit' }, user: client, overrideAccess: false }))
      const fakeImage = Buffer.from('MZ executable'); const fakePDF = Buffer.from('<script>bad</script>')
      await assert.rejects(validateMediaFile({ data: fakeImage, name: 'pretendue.png', mimetype: 'image/png', size: fakeImage.length }), /Image invalide/)
      await assert.rejects(validateMediaFile({ data: fakePDF, name: 'pretendue.pdf', mimetype: 'application/pdf', size: fakePDF.length }), /signature/)
      await assert.rejects(validateMediaFile({ data, name: 'image.exe', mimetype: 'image/png', size: data.length }))
      const originalBytes = await readFile(path.join(files, original.filename!))
      const alternateData = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#000000' } }).png().toBuffer()
      await assert.rejects(payload.update({ collection: 'media', id: original.id, file: { data: alternateData, size: alternateData.length, name: original.filename!, mimetype: 'image/png' }, overwriteExistingFiles: true, data: { alt: 'Écrasement' }, user: owner, overrideAccess: false }))
      assert.deepEqual(await readFile(path.join(files, original.filename!)), originalBytes)
      const cropAttempt = await handleEndpoints({ config, request: new Request(`http://localhost:4413/api/media/${original.id}?uploadEdits[crop][width]=50&uploadEdits[crop][height]=50`, { method: 'PATCH', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt: 'Recadrage ultérieur' }) }) })
      assert.equal(cropAttempt.status, 400); await cropAttempt.arrayBuffer()
      assert.deepEqual(await readFile(path.join(files, original.filename!)), originalBytes)
      await assert.rejects(payload.delete({ collection: 'media', id: original.id, user: owner, overrideAccess: false }))
      const maliciousMetadata = await handleEndpoints({ config, request: new Request(`http://localhost:4413/api/media/${original.id}`, { method: 'PATCH', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/replacement.png', filename: 'replacement.png', mimeType: 'image/jpeg' }) }) })
      assert.equal(maliciousMetadata.status, 400); await maliciousMetadata.arrayBuffer()
      await assert.rejects(payload.update({ collection: 'media', id: original.id, data: { url: 'https://example.com/replacement.png' }, overrideAccess: true }))
      assert.equal((await payload.findByID({ collection: 'media', id: original.id, user: owner, overrideAccess: false })).url, original.url)
    })

    await t.test('inventaire des brouillons, du public, des versions et des publications figées', async () => {
      original = await payload.update({ collection: 'media', id: original.id, data: { visibility: 'public' }, user: owner, overrideAccess: false }) as LibraryMedia
      const page = await payload.create({ collection: 'pages', depth: 0, data: { title: 'Page de recette média', path: '/recette-media', _status: 'published', layout: [{ blockType: 'editorial', title: 'Image initiale', media: original.id }], seo: { image: original.id } }, user: owner, overrideAccess: false })
      pageID = Number(page.id)
      await payload.update({ collection: 'pages', id: pageID, locale: 'en', data: { title: 'Media test page', _status: 'published' }, user: owner, overrideAccess: false })
      await payload.create({ collection: 'shared-sections', data: { title: 'Section de recette', _status: 'published', layout: [{ blockType: 'editorial', title: 'Partagée', media: original.id }] }, user: owner, overrideAccess: false })
      const content = structuredClone(defaultContent); content.hero.poster = new URL(original.url!, config.serverURL).pathname; content.projects[0].imageSrc = new URL(original.sizes?.card?.url || original.url!, config.serverURL).pathname
      const global = await payload.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(content), _status: 'published' }, user: owner, overrideAccess: false })
      await payload.updateGlobal({ slug: 'site-content', locale: 'en', data: { ...toPayloadContent({ ...content, hero: { ...content.hero, firstVerb: 'English media test' } }), _status: 'published' }, user: owner, overrideAccess: false })
      const release = await payload.create({ collection: 'publication-releases', data: { title: 'Publication de recette', page: pageID, pageSnapshot: page, contentSnapshot: global, actor: owner.id }, overrideAccess: true })
      releaseID = Number(release.id)
      const usage = await getMediaUsage(payload, owner, Number(original.id))
      for (const kind of ['draft', 'public', 'version', 'release']) assert.ok(usage.usages.some(item => item.kind === kind), `${kind} absent`)
      assert.ok(usage.usages.some(item => item.source === 'site-content' && item.fields.some(field => field.startsWith('hero.') && field.endsWith('.poster'))))
      assert.ok(usage.usages.some(item => item.kind === 'draft' && item.source === 'site-content' && item.fields.some(field => field.includes('.en.') && field.endsWith('.poster'))))
      assert.equal(mediaReferences({ budget: Number(original.id), description: `Un nombre ${original.id}` }, original).paths.length, 0)
    })

    await t.test('le remplacement crée des brouillons et conserve public, langues, anciens fichiers et historique', async () => {
      const usage = await getMediaUsage(payload, owner, Number(original.id))
      const result = await replaceMediaReferences(payload, owner, { fromID: original.id, toID: next.id, fingerprint: usage.fingerprint })
      assert.equal(result.published, false); assert.equal(result.retainedOriginal, true); assert.equal(result.updated.length, 3)
      const draft = await payload.findByID({ collection: 'pages', id: pageID, draft: true, depth: 0, user: owner, overrideAccess: false })
      const published = await payload.findByID({ collection: 'pages', id: pageID, draft: false, depth: 0, overrideAccess: false, user: null })
      assert.equal((draft.layout as Array<{ media: number }>)[0].media, next.id)
      assert.equal((published.layout as Array<{ media: number }>)[0].media, original.id)
      const english = await payload.findByID({ collection: 'pages', id: pageID, draft: true, locale: 'en', depth: 0, user: owner, overrideAccess: false }); assert.equal(english.title, 'Media test page')
      const draftGlobal = fromPayloadContent(await payload.findGlobal({ slug: 'site-content', draft: true, user: owner, overrideAccess: false }))
      const publicGlobal = fromPayloadContent(await payload.findGlobal({ slug: 'site-content', draft: false, user: owner, overrideAccess: false }))
      assert.equal(draftGlobal.hero.poster, new URL(next.url!, config.serverURL).pathname); assert.equal(publicGlobal.hero.poster, new URL(original.url!, config.serverURL).pathname)
      const englishGlobal = fromPayloadContent(await payload.findGlobal({ slug: 'site-content', locale: 'en', draft: true, user: owner, overrideAccess: false }))
      assert.equal(englishGlobal.hero.firstVerb, 'English media test'); assert.equal(englishGlobal.hero.poster, new URL(next.url!, config.serverURL).pathname)
      const release = await payload.findByID({ collection: 'publication-releases', id: releaseID, depth: 0, user: owner, overrideAccess: false })
      assert.equal(((release.pageSnapshot as Record<string, unknown>).layout as Array<{ media: number }>)[0].media, original.id)
      assert.ok((await stat(path.join(files, original.filename!))).size)
      await assert.rejects(replaceMediaReferences(payload, owner, { fromID: original.id, toID: next.id, fingerprint: usage.fingerprint }), error => error instanceof MediaError && error.status === 409)
      const after = await getMediaUsage(payload, owner, Number(original.id)); assert.equal(after.usages.filter(item => item.kind === 'draft').length, 0); assert.ok(after.usages.some(item => item.kind === 'release'))
    })

    await t.test('métadonnées groupées atomiques, conflits et retrait effectif de diffusion', async () => {
      const first = await payload.findByID({ collection: 'media', id: original.id, depth: 0, user: owner, overrideAccess: false })
      await updateMediaMetadata(payload, owner, { ids: [original.id], patch: { credit: 'Crédit de recette', tags: ['recette', 'image'], collection: 'Recette / validée' }, revisions: { [original.id]: first.updatedAt } })
      await assert.rejects(updateMediaMetadata(payload, owner, { ids: [original.id], patch: { credit: 'Écrasement concurrent' }, revisions: { [original.id]: first.updatedAt } }), error => error instanceof MediaError && error.status === 409)
      const fresh = await payload.findByID({ collection: 'media', id: original.id, depth: 0, user: owner, overrideAccess: false })
      await assert.rejects(updateMediaMetadata(payload, owner, { ids: [original.id, next.id], patch: { credit: 'Doit être annulé' }, revisions: { [original.id]: fresh.updatedAt, [next.id]: '2000-01-01T00:00:00.000Z' } }))
      assert.equal((await payload.findByID({ collection: 'media', id: original.id, user: owner, overrideAccess: false })).credit, 'Crédit de recette')
      await updateMediaMetadata(payload, owner, { ids: [original.id], patch: { visibility: 'restricted' }, revisions: { [original.id]: fresh.updatedAt } })
      const response = await handleEndpoints({ config, request: new Request(new URL(original.url!, config.serverURL)) })
      assert.ok([403, 404].includes(response.status)); await response.arrayBuffer()
    })

    await t.test('quota observé appliqué avant écriture des nouveaux fichiers', async () => {
      const before = await storageObservation(payload); assert.ok(before.available)
      process.env.MEDIA_STORAGE_MAX_BYTES = String(before.bytes + 1)
      try { await assert.rejects(payload.create({ collection: 'media', file: makeFile('quota.png'), data: { alt: 'Import au-delà du quota' }, user: owner, overrideAccess: false }), /quota/i) }
      finally { delete process.env.MEDIA_STORAGE_MAX_BYTES }
      const after = await storageObservation(payload); assert.ok(after.available); assert.equal(after.bytes, before.bytes)
    })
    await t.test('import historique idempotent sans modification des sources ni contenus', async () => {
      const publicFixture = path.join(directory, 'public'); await mkdir(publicFixture)
      await writeFile(path.join(publicFixture, 'original-public.png'), data)
      await writeFile(path.join(publicFixture, 'excluded.svg'), '<svg></svg>')
      const globalBefore = await payload.findGlobal({ slug: 'site-content', locale: 'all', draft: true, depth: 0 })
      const imported = await importPublicMedia(payload, publicFixture)
      assert.equal(imported.imported.length, 1); assert.equal(imported.failed.length, 0); assert.equal(imported.skipped.length, 1)
      assert.deepEqual(await readFile(path.join(publicFixture, 'original-public.png')), data)
      const again = await importPublicMedia(payload, publicFixture)
      assert.equal(again.imported.length, 0); assert.equal(again.existing.length, 1)
      assert.deepEqual(await payload.findGlobal({ slug: 'site-content', locale: 'all', draft: true, depth: 0 }), globalBefore)
      const importedMedia = await payload.findByID({ collection: 'media', id: imported.imported[0].id, depth: 0 })
      assert.equal(importedMedia.visibility, 'public'); assert.match(String(importedMedia.authorization), /non vérifiés/)
    })
  } finally {
    (payload.db as unknown as { client?: { close: () => void } }).client?.close(); await payload.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => { /* Isolated ignored fixture may remain while Windows holds a SQLite handle. */ })
  }
})
