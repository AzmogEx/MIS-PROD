import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { inspectMP4, inspectWebM } from '../src/cms/media-video'
import type { PayloadRequest } from 'payload'
import type { LibraryMedia } from '../src/cms/media-services'

const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
test('Vidéo réelle : import reprenable, Range, versions, droits, liens et persistance', async t => {
  await mkdir('.data/tests', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/tests/video-')), files = path.join(directory, 'media'), database = path.join(directory, 'video.db').replaceAll('\\', '/')
  const previous = { private: process.env.CMS_PRIVATE_FILES_DIR, imports: process.env.MEDIA_IMPORT_ROOT }
  process.env.CMS_PRIVATE_FILES_DIR = path.join(directory, 'private'); process.env.MEDIA_IMPORT_ROOT = path.join(directory, 'imports')
  const [{ buildConfig, getPayload, handleEndpoints }, { sqliteAdapter }, { default: sharp }, { coreCollections, siteContent }, { clientCollections }, { SubmissionLimits }, media, imports, { mediaImportHandlers }, { clientFileHandlers }, services, { installTransactionQueue }] = await Promise.all([
    import('payload'), import('@payloadcms/db-sqlite'), import('sharp'), import('../src/cms/collections'), import('../src/cms/client-collections'), import('../src/cms/operation-collections'), import('../src/cms/media-services'), import('../src/cms/media-imports'), import('../src/cms/media-import-http'), import('../src/cms/client-file-http'), import('../src/cms/client-services'), import('../src/cms/transaction-queue'),
  ])
  const config = await buildConfig({ secret: randomBytes(48).toString('hex'), onInit: installTransactionQueue, telemetry: false, sharp, logger: { options: { level: 'fatal' } }, admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false }, serverURL: 'http://localhost:4498', localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true }, db: sqliteAdapter({ client: { url: `file:${database}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }), collections: [...coreCollections.map(collection => collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: files } } : collection), ...clientCollections, SubmissionLimits], globals: [siteContent] })
  const payload = await getPayload({ config }), bytes = await readFile('public/hero.mp4')
  const password = randomBytes(25).toString('hex')
  const owner = { ...await payload.create({ collection: 'users', context: { bootstrap: true }, data: { name: 'Vidéo recette', email: 'video-owner@example.test', password, role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const clientPassword = randomBytes(25).toString('hex'), otherPassword = randomBytes(25).toString('hex')
  const client = { ...await payload.create({ collection: 'users', data: { name: 'Client recette', email: 'video-client@example.test', password: clientPassword, role: 'client' }, user: owner }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  await payload.create({ collection: 'users', data: { name: 'Autre client', email: 'video-other@example.test', password: otherPassword, role: 'client' }, user: owner })
  const auth = async (email: string, password: string) => ({ Authorization: `JWT ${(await payload.login({ collection: 'users', data: { email, password } })).token}` })
  const ownerAuth = await auth('video-owner@example.test', password), clientAuth = await auth('video-client@example.test', clientPassword), otherAuth = await auth('video-other@example.test', otherPassword)
  const handlers = mediaImportHandlers(async () => payload), privateHTTP = clientFileHandlers(async () => payload)
  const request = (url: string, headers: Record<string, string> = {}, method = 'GET') => new Request(new URL(url, config.serverURL), { method, headers })
  let video: LibraryMedia, pageID: number, privateID: number, projectID: number, deliveryID: number
  try {
    await t.test('conteneur H.264 réel et refus de conteneurs tronqués/faux/codec incompatible avant écriture', async () => {
      const info = inspectMP4(bytes)
      assert.deepEqual(info, { container: 'mp4', codecs: ['avc1'], width: 1920, height: 1080, duration: 15.44, fastStart: true })
      assert.throws(() => inspectMP4(bytes.subarray(0, 32)), /MP4 complet/)
      assert.throws(() => inspectMP4(bytes.subarray(0, -1)), /incohérente/)
      assert.throws(() => inspectWebM(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), /incomplet/)
      const unsupported = Buffer.from(bytes); unsupported.write('hvc1', unsupported.indexOf(Buffer.from('avc1'), 40))
      assert.throws(() => inspectMP4(unsupported), /H.264/)
      const bad = { data: bytes.subarray(0, 32), size: 32, name: 'faux.mp4', mimetype: 'video/mp4' }
      await assert.rejects(payload.create({ collection: 'media', user: owner, file: bad, data: { alt: 'Faux film' } }))
      const project = await payload.create({ collection: 'projects', data: { title: 'Recette vidéo privée', members: [client.id] }, user: owner }); projectID = Number(project.id)
      await assert.rejects(payload.create({ collection: 'private-files', user: owner, file: bad, data: { title: 'Faux film', project: projectID } }))
      assert.equal((await payload.count({ collection: 'media' })).totalDocs, 0)
      assert.equal((await payload.count({ collection: 'private-files' })).totalDocs, 0)
    })
    await t.test('deux fragments réels, reprise, finalisation répétée sans doublon et octets persistants', async () => {
      const chunks = Array.from({ length: Math.ceil(bytes.length / imports.MEDIA_CHUNK_BYTES) }, (_, index) => bytes.subarray(index * imports.MEDIA_CHUNK_BYTES, (index + 1) * imports.MEDIA_CHUNK_BYTES))
      assert.equal(chunks.length, 2)
      const input = { action: 'start', name: 'film-reel.mp4', type: 'video/mp4', size: bytes.length, fingerprint: imports.mediaImportFingerprint(bytes.length, chunks.map(hash)) }
      const start = async (extra = {}) => { const res = await handlers.POST(new Request('http://localhost:4498/api/media-imports', { method: 'POST', headers: { ...ownerAuth, Origin: 'http://localhost:4498', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, ...extra }) })); assert.equal(res.status, 200); return res.json() }
      const first = await start()
      const put = async (session: { id: string; token: string }, index: number) => handlers.PUT(new Request(`http://localhost:4498/api/media-imports?id=${session.id}&index=${index}`, { method: 'PUT', headers: { ...ownerAuth, Origin: 'http://localhost:4498', 'X-Media-Import-Token': session.token }, body: new Uint8Array(chunks[index]) }))
      assert.equal((await put(first, 0)).status, 200)
      const resumed = await start({ resumeID: first.id }); assert.deepEqual(resumed.received, [0])
      assert.equal((await put(resumed, 1)).status, 200)
      const completed = await imports.finalizeMediaImport(payload, owner, { id: resumed.id, token: resumed.token }); video = completed.media
      assert.equal((await imports.finalizeMediaImport(payload, owner, { id: resumed.id, token: resumed.token })).media.id, video.id)
      assert.equal(video.width, 1920); assert.equal(video.height, 1080)
      assert.equal(hash(await readFile(path.join(files, video.filename!))), hash(bytes))
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', "import {DatabaseSync} from 'node:sqlite'; import {readFileSync} from 'node:fs'; import {createHash} from 'node:crypto'; const db=new DatabaseSync(process.argv[1],{readOnly:true}); const row=db.prepare('select filename,width,height from media where id=?').get(Number(process.argv[2])); console.log(JSON.stringify({width:row.width,height:row.height,hash:createHash('sha256').update(readFileSync(process.argv[3]+'/'+row.filename)).digest('hex')}));db.close()", database, String(video.id), files], { encoding: 'utf8' })
      assert.deepEqual(JSON.parse(output), { width: 1920, height: 1080, hash: hash(bytes) })
    })
    await t.test('poster, VTT anglais et diffusion publique avec Range exact, suffixe et bornes refusées', async () => {
      const png = await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#c9a961' } }).png().toBuffer()
      const poster = await payload.create({ collection: 'media', user: owner, file: { data: png, size: png.length, name: 'affiche.png', mimetype: 'image/png' }, data: { alt: 'Affiche de recette', visibility: 'public' } })
      const vtt = Buffer.from('WEBVTT\n\n00:00.000 --> 00:04.000\nLocal video acceptance test.\n')
      const captions = await payload.create({ collection: 'media', user: owner, file: { data: vtt, size: vtt.length, name: 'captions-en.vtt', mimetype: 'text/vtt' }, data: { alt: 'Sous-titres anglais', visibility: 'public', language: 'en' } })
      await assert.rejects(payload.update({ collection: 'media', id: video.id, user: owner, data: { captions: poster.id } }), /Sous-titres/)
      await assert.rejects(payload.update({ collection: 'media', id: video.id, user: owner, data: { poster: captions.id } }), /Affiche/)
      video = await payload.update({ collection: 'media', id: video.id, user: owner, depth: 2, data: { poster: poster.id, captions: captions.id, language: 'en', transcript: 'Local video acceptance test.', visibility: 'public' } }) as LibraryMedia
      for (const [range, start, end] of [['bytes=0-511', 0, 511], ['bytes=1048576-1049599', 1048576, 1049599], ['bytes=-256', bytes.length - 256, bytes.length - 1]] as const) {
        const response = await handleEndpoints({ config, request: request(video.url!, { Range: range }) })
        assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${bytes.length}`)
        assert.match(response.headers.get('cache-control')!, /no-store/); assert.equal(response.headers.get('content-type'), 'video/mp4')
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(start, end + 1))
      }
      const invalid = await handleEndpoints({ config, request: request(video.url!, { Range: `bytes=${bytes.length}-` }) }); assert.equal(invalid.status, 416); await invalid.arrayBuffer()
      const text = await handleEndpoints({ config, request: request(String(captions.url)) }); assert.equal(text.status, 200); assert.match(text.headers.get('content-type')!, /text\/vtt/); assert.equal(await text.text(), vtt.toString())
      const page = await payload.create({ collection: 'pages', user: owner, depth: 0, data: { title: 'Vidéo de recette', path: '/recette-video', _status: 'published', layout: [{ blockType: 'editorial', title: 'Film local', media: video.id }] } }); pageID = Number(page.id)
      const published = await payload.findByID({ collection: 'pages', id: pageID, depth: 3, draft: false, overrideAccess: false })
      const relation = (published.layout as Array<{ media: { captions: { language: string }; poster: { sizes: { card: { url: string } } } } }>)[0].media
      assert.equal(relation.captions.language, 'en'); assert.ok(relation.poster.sizes.card.url)
      const usage = await media.getMediaUsage(payload, owner, Number(captions.id)); assert.ok(usage.usages.some(item => item.kind === 'dependency' && item.id === String(video.id)))
    })
    await t.test('remplacement de référence en brouillon, original et publication antérieure intacts', async () => {
      const next = await payload.create({ collection: 'media', user: owner, file: { data: bytes, size: bytes.length, name: 'film-v2.mp4', mimetype: 'video/mp4' }, data: { alt: 'Version suivante', visibility: 'public' } })
      const usage = await media.getMediaUsage(payload, owner, Number(video.id)); assert.ok(usage.usages.some(item => item.kind === 'release'))
      await media.replaceMediaReferences(payload, owner, { fromID: video.id, toID: next.id, fingerprint: usage.fingerprint })
      const draft = await payload.findByID({ collection: 'pages', id: pageID, draft: true, depth: 0, user: owner }), publicPage = await payload.findByID({ collection: 'pages', id: pageID, draft: false, depth: 0, overrideAccess: false })
      assert.equal((draft.layout as Array<{ media: number }>)[0].media, next.id); assert.equal((publicPage.layout as Array<{ media: number }>)[0].media, video.id)
      await assert.rejects(payload.update({ collection: 'media', id: video.id, user: owner, overwriteExistingFiles: true, file: { data: bytes, size: bytes.length, name: video.filename!, mimetype: 'video/mp4' }, data: { alt: 'Écrasement refusé' } }))
      assert.equal(hash(await readFile(path.join(files, video.filename!))), hash(bytes))
      await payload.update({ collection: 'media', id: video.id, user: owner, data: { rightsUntil: new Date(Date.now() - 1000).toISOString() } })
      const denied = await handleEndpoints({ config, request: request(video.url!, { Range: 'bytes=0-511' }) }); assert.ok([403, 404].includes(denied.status)); await denied.arrayBuffer()
      const hidden = await payload.findByID({ collection: 'pages', id: pageID, draft: false, depth: 3, overrideAccess: false }); assert.equal(typeof (hidden.layout as Array<{ media: unknown }>)[0].media, 'number') // Unpopulated ID has no URL and the renderer omits it.
    })
    await t.test('fichier privé MP4 : ACL par session, HEAD/Range, URL native interdite et validations immuables', async () => {
      const file = await payload.create({ collection: 'private-files', user: owner, file: { data: bytes, size: bytes.length, name: 'livrable-v1.mp4', mimetype: 'video/mp4' }, data: { title: 'Livrable vidéo', project: projectID } }); privateID = Number(file.id)
      const delivery = await payload.create({ collection: 'deliverables', user: owner, data: { title: 'Film', version: 'V1', project: projectID, file: privateID, duration: 15.44, clientVisible: true } }); deliveryID = Number(delivery.id)
      await payload.create({ collection: 'approvals', user: client, data: { project: projectID, deliverable: deliveryID, decision: 'accepted' } })
      const url = `/api/client/files/${privateID}`
      assert.equal((await privateHTTP.file(request(url), String(privateID))).status, 401)
      assert.equal((await privateHTTP.file(request(url, otherAuth), String(privateID))).status, 404)
      for (const range of ['bytes=0-1023', 'bytes=-1024']) {
        const response = await privateHTTP.file(request(url, { ...clientAuth, Range: range }), String(privateID)); assert.equal(response.status, 206)
        assert.match(response.headers.get('cache-control')!, /no-store/); assert.deepEqual(Buffer.from(await response.arrayBuffer()), range.includes('-1024') ? bytes.subarray(-1024) : bytes.subarray(0, 1024))
      }
      const head = await privateHTTP.file(request(url, clientAuth, 'HEAD'), String(privateID)); assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(bytes.length)); assert.equal((await head.arrayBuffer()).byteLength, 0)
      assert.equal((await privateHTTP.file(request(url, { ...clientAuth, Range: 'bytes=999999999-' }), String(privateID))).status, 416)
      const native = await handleEndpoints({ config, request: request(`/api/private-files/file/${file.filename}`, clientAuth) }); assert.ok([403, 404].includes(native.status)); await native.arrayBuffer()
      await assert.rejects(payload.update({ collection: 'private-files', id: privateID, user: owner, overwriteExistingFiles: true, file: { data: bytes, size: bytes.length, name: String(file.filename), mimetype: 'video/mp4' }, data: { title: 'Écrasement' } }))
      assert.equal(hash(await readFile(path.join(process.env.CMS_PRIVATE_FILES_DIR!, String(file.filename)))), hash(bytes))
      const next = await payload.create({ collection: 'private-files', user: owner, file: { data: bytes, size: bytes.length, name: 'livrable-v2.mp4', mimetype: 'video/mp4' }, data: { title: 'Livrable suivant', project: projectID } })
      await payload.create({ collection: 'deliverables', user: owner, data: { title: 'Film', version: 'V2', project: projectID, file: next.id, duration: 15.44, clientVisible: true } })
      const approvals = await payload.find({ collection: 'approvals', user: client, depth: 0, overrideAccess: false }); assert.equal(services.relationID(approvals.docs[0].deliverable), deliveryID)
    })
    await t.test('liens temporaires, révocation, expiration fichier et archivage projet bloquent les nouveaux segments', async () => {
      const { token, hash: tokenHash } = services.newShareToken()
      const share = await payload.create({ collection: 'file-shares', overrideAccess: true, user: owner, data: { title: 'Lien de recette', project: projectID, file: privateID, tokenHash, expiresAt: new Date(Date.now() + 60000).toISOString(), createdBy: owner.id } })
      const url = `/api/client/shared/${token}`, range = request(url, { Range: 'bytes=0-31' })
      let response = await privateHTTP.shared(range, token); assert.equal(response.status, 206); await response.arrayBuffer()
      await payload.update({ collection: 'file-shares', id: share.id, user: owner, data: { revoked: true } }); assert.equal((await privateHTTP.shared(range, token)).status, 404)
      await payload.update({ collection: 'file-shares', id: share.id, user: owner, data: { revoked: false, expiresAt: new Date(Date.now() - 1000).toISOString() } }); assert.equal((await privateHTTP.shared(range, token)).status, 404)
      await payload.update({ collection: 'file-shares', id: share.id, user: owner, data: { expiresAt: new Date(Date.now() + 60000).toISOString() } })
      await payload.update({ collection: 'private-files', id: privateID, user: owner, data: { expiresAt: new Date(Date.now() - 1000).toISOString() } })
      response = await privateHTTP.file(request(`/api/client/files/${privateID}`, clientAuth), String(privateID)); assert.equal(response.status, 404); assert.match(response.headers.get('cache-control')!, /no-store/)
      assert.equal((await privateHTTP.shared(range, token)).status, 404)
      await payload.update({ collection: 'private-files', id: privateID, user: owner, data: { expiresAt: null } }); await payload.update({ collection: 'projects', id: projectID, user: owner, data: { archived: true } })
      assert.equal((await privateHTTP.shared(range, token)).status, 404); assert.equal((await privateHTTP.file(request(`/api/client/files/${privateID}`, clientAuth), String(privateID))).status, 404)
      assert.ok((await readdir(process.env.CMS_PRIVATE_FILES_DIR!)).length >= 2)
    })
    await t.test('quota privé mesuré avant écriture sans effacer les anciennes versions', async () => {
      const before = await services.privateStorageObservation(), previousQuota = process.env.CMS_PRIVATE_STORAGE_MAX_BYTES
      process.env.CMS_PRIVATE_STORAGE_MAX_BYTES = String(before.bytes + bytes.length - 1)
      try { await assert.rejects(payload.create({ collection: 'private-files', user: owner, file: { data: bytes, size: bytes.length, name: 'quota.mp4', mimetype: 'video/mp4' }, data: { title: 'Au-delà du quota', project: projectID } }), /quota/) }
      finally { if (previousQuota === undefined) delete process.env.CMS_PRIVATE_STORAGE_MAX_BYTES; else process.env.CMS_PRIVATE_STORAGE_MAX_BYTES = previousQuota }
      const after = await services.privateStorageObservation(); assert.equal(after.bytes, before.bytes); assert.equal(after.files, before.files)
    })
    await t.test('SVG statique et ICO PNG passent les vrais imports ; source active refusée avant écriture', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#c9a961"/></svg>')
      const form = new FormData(); form.append('file', new Blob([svg], { type: 'image/svg+xml' }), 'logo-test.svg'); form.append('_payload', JSON.stringify({ alt: 'Logo SVG de recette', visibility: 'public' }))
      const created = await handleEndpoints({ config, request: new Request('http://localhost:4498/api/media', { method: 'POST', headers: ownerAuth, body: form }) }); const result = await created.json(); assert.equal(created.status, 201, JSON.stringify(result))
      assert.equal(hash(await readFile(path.join(files, result.doc.filename))), hash(svg))
      const served = await handleEndpoints({ config, request: request(result.doc.url) }); assert.equal(served.status, 200); assert.match(served.headers.get('content-security-policy')!, /script-src 'none'/); assert.match(served.headers.get('x-content-type-options')!, /nosniff/); await served.arrayBuffer()
      const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#c9a961' } }).png().toBuffer()
      const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 32; header[7] = 32; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18)
      const ico = Buffer.concat([header, png]), session = await imports.startMediaImport(payload, owner, { name: 'favicon-test.ico', type: 'image/x-icon', size: ico.length, fingerprint: imports.mediaImportFingerprint(ico.length, [hash(ico)]) })
      await imports.putMediaChunk(payload, owner, { id: session.id, token: session.token, index: 0, data: ico })
      const icon = await imports.finalizeMediaImport(payload, owner, { id: session.id, token: session.token })
      assert.equal(hash(await readFile(path.join(files, icon.media.filename!))), hash(ico))
      const before = await readdir(files), active = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>alert(1)</script></svg>')
      await assert.rejects(payload.create({ collection: 'media', user: owner, data: { alt: 'SVG actif' }, file: { data: active, size: active.length, name: 'actif.svg', mimetype: 'image/svg+xml' } }))
      assert.deepEqual(await readdir(files), before)
    })
  } finally {
    await payload.destroy(); (payload.db as unknown as { client?: { close(): void } }).client?.close()
    if (previous.private === undefined) delete process.env.CMS_PRIVATE_FILES_DIR; else process.env.CMS_PRIVATE_FILES_DIR = previous.private
    if (previous.imports === undefined) delete process.env.MEDIA_IMPORT_ROOT; else process.env.MEDIA_IMPORT_ROOT = previous.imports
    if (directory.startsWith(path.resolve('.data/tests') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 3 }).catch(() => undefined)
  }
})
