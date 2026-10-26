import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash, randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import { coreCollections } from '../src/cms/collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { mediaImportHandlers } from '../src/cms/media-import-http'
import { MEDIA_CHUNK_BYTES, cancelMediaImport, finalizeMediaImport, getMediaImport, listMediaImports, mediaImportFingerprint, putMediaChunk, startMediaImport } from '../src/cms/media-imports'
import { MediaError } from '../src/cms/media-services'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import type { ImageImportEdits } from '../src/cms/media-image-edits'

const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const fingerprint = (data: Buffer) => mediaImportFingerprint(data.length, Array.from({ length: Math.ceil(data.length / MEDIA_CHUNK_BYTES) }, (_, index) => digest(data.subarray(index * MEDIA_CHUNK_BYTES, (index + 1) * MEDIA_CHUNK_BYTES))))
const rejected = (status: number) => (error: unknown) => error instanceof MediaError && error.status === status

test('Imports reprenables : fichiers durables, API autorisée, reprise après redémarrage et finalisation idempotente', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-imports-')); const files = path.join(directory, 'files'); const imports = path.join(directory, 'imports')
  const previousRoot = process.env.MEDIA_IMPORT_ROOT; process.env.MEDIA_IMPORT_ROOT = imports
  const database = path.join(directory, 'imports.db').replaceAll('\\', '/'); const secret = randomBytes(48).toString('hex')
  const config = await buildConfig({ secret, onInit: installTransactionQueue, telemetry: false, sharp, admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false }, serverURL: 'http://localhost:4497', localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true }, db: sqliteAdapter({ client: { url: `file:${database}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }), collections: [...coreCollections.map(collection => collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: files } } : collection), SubmissionLimits] })
  const payload = await getPayload({ config }); const password = randomBytes(30).toString('hex')
  const owner = { ...await payload.create({ collection: 'users', context: { bootstrap: true }, data: { email: 'imports-owner@example.test', name: 'Recette imports', password, role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const editor = { ...await payload.create({ collection: 'users', data: { email: 'imports-editor@example.test', name: 'Éditeur de recette', password: randomBytes(30).toString('hex'), role: 'editor' }, user: owner, overrideAccess: false }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const other = { ...await payload.create({ collection: 'users', data: { email: 'imports-other@example.test', name: 'Autre éditeur', password: randomBytes(30).toString('hex'), role: 'editor' }, user: owner, overrideAccess: false }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const data = await sharp(randomBytes(1500 * 1500 * 4), { raw: { width: 1500, height: 1500, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer()
  const input = { name: 'image-test.png', type: 'image/png', size: data.length, fingerprint: fingerprint(data), collection: 'Recette' }
  const handlers = mediaImportHandlers(async () => payload)
  let session: Awaited<ReturnType<typeof startMediaImport>>
  try {
    const login = await payload.login({ collection: 'users', data: { email: 'imports-owner@example.test', password } })
    const headers = { Authorization: `JWT ${login.token}`, Origin: 'http://localhost:4497', 'Content-Type': 'application/json' }
    await t.test('API : refus anonyme et CSRF, réservation bornée, premier fragment confirmé', async () => {
      assert.equal((await handlers.GET(new Request('http://localhost:4497/api/media-imports'))).status, 401)
      const csrf = await handlers.POST(new Request('http://localhost:4497/api/media-imports', { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify({ action: 'start', ...input }) })); assert.equal(csrf.status, 403)
      const created = await handlers.POST(new Request('http://localhost:4497/api/media-imports', { method: 'POST', headers, body: JSON.stringify({ action: 'start', ...input }) })); assert.equal(created.status, 200)
      session = await created.json(); assert.equal(session.receivedBytes, 0); assert.equal(session.chunkSize, MEDIA_CHUNK_BYTES)
      const first = await handlers.PUT(new Request(`http://localhost:4497/api/media-imports?id=${session.id}&index=0`, { method: 'PUT', headers: { ...headers, 'X-Media-Import-Token': session.token, 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(data.subarray(0, MEDIA_CHUNK_BYTES)) })); assert.equal(first.status, 200); assert.equal((await first.json()).receivedBytes, MEDIA_CHUNK_BYTES)
      await assert.rejects(finalizeMediaImport(payload, owner, { id: session.id, token: session.token }), rejected(409))
    })
    await t.test('état relu dans un nouveau processus Node puis rotation du jeton et transfert des fragments manquants', async () => {
      const script = `
        import {buildConfig,getPayload} from 'payload'; import {sqliteAdapter} from '@payloadcms/db-sqlite'; import sharp from 'sharp';
        import {coreCollections} from './src/cms/collections.ts'; import {SubmissionLimits} from './src/cms/operation-collections.ts'; import {getMediaImport} from './src/cms/media-imports.ts'; import {installTransactionQueue} from './src/cms/transaction-queue.ts';
        const config=await buildConfig({secret:process.env.IMPORT_TEST_SECRET,onInit:installTransactionQueue,telemetry:false,sharp,admin:{disable:true},typescript:{autoGenerate:false},graphQL:{disable:true},localization:{locales:['fr','en'],defaultLocale:'fr'},db:sqliteAdapter({client:{url:process.env.IMPORT_TEST_DB},push:false,busyTimeout:10000,wal:true,transactionOptions:{behavior:'immediate'}}),collections:[...coreCollections.map(c=>c.slug==='media'?{...c,upload:{...c.upload,staticDir:process.env.IMPORT_TEST_FILES}}:c),SubmissionLimits]});
        const cms=await getPayload({config}); const result=await getMediaImport(cms,JSON.parse(process.env.IMPORT_TEST_USER),{id:process.env.IMPORT_TEST_ID,token:process.env.IMPORT_TEST_TOKEN}); console.log('IMPORT_STATUS:'+JSON.stringify(result)); cms.db.client?.close(); await cms.destroy();
      `
      const child = await promisify(execFile)(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), timeout: 30000, env: { ...process.env, IMPORT_TEST_SECRET: secret, IMPORT_TEST_DB: `file:${database}`, IMPORT_TEST_FILES: files, IMPORT_TEST_USER: JSON.stringify({ id: owner.id, role: 'owner', collection: 'users' }), IMPORT_TEST_ID: session.id, IMPORT_TEST_TOKEN: session.token } })
      const persisted = JSON.parse(child.stdout.split('\n').find(line => line.startsWith('IMPORT_STATUS:'))!.slice('IMPORT_STATUS:'.length)); assert.deepEqual(persisted.received, [0])
      const oldToken = session.token; session = await startMediaImport(payload, owner, input)
      assert.equal(session.resumed, true); assert.equal(session.receivedBytes, MEDIA_CHUNK_BYTES)
      await assert.rejects(getMediaImport(payload, owner, { id: session.id, token: oldToken }), rejected(403))
      for (const index of [2, 1]) await putMediaChunk(payload, owner, { id: session.id, token: session.token, index, data: data.subarray(index * MEDIA_CHUNK_BYTES, (index + 1) * MEDIA_CHUNK_BYTES) })
      await putMediaChunk(payload, owner, { id: session.id, token: session.token, index: 0, data: data.subarray(0, MEDIA_CHUNK_BYTES) })
      await assert.rejects(putMediaChunk(payload, owner, { id: session.id, token: session.token, index: 0, data: Buffer.alloc(MEDIA_CHUNK_BYTES) }), rejected(409))
    })
    await t.test('finalisation REST et nouvelle tentative après commit créent un seul média, restreint', async () => {
      const request = () => new Request('http://localhost:4497/api/media-imports', { method: 'POST', headers: { ...headers, 'X-Media-Import-Token': session.token }, body: JSON.stringify({ action: 'finalize', id: session.id }) })
      const result = await handlers.POST(request()); const first = await result.json(); assert.equal(result.status, 200, JSON.stringify(first)); assert.equal(first.media.visibility, 'restricted')
      assert.equal(digest(await readFile(path.join(files, first.media.filename))), digest(data))
      const second = await handlers.POST(request()); assert.equal(second.status, 200); assert.equal((await second.json()).media.id, first.media.id)
      assert.equal((await payload.count({ collection: 'media', where: { sourceKey: { equals: `resumable:${session.id}` } } })).totalDocs, 1)
      assert.equal((await readdir(path.join(imports, session.id))).filter(name => name.endsWith('.part')).length, 0)
      // Simulate losing only the post-commit manifest write and stale process marker.
      const file = path.join(imports, session.id, 'manifest.json'); const manifest = JSON.parse(await readFile(file, 'utf8')); manifest.status = 'processing'; delete manifest.mediaID; await writeFile(file, JSON.stringify(manifest))
      await writeFile(path.join(imports, session.id, '.lock'), JSON.stringify({ pid: 2147483647, nonce: 'dead-process' }))
      assert.equal((await finalizeMediaImport(payload, owner, { id: session.id, token: session.token })).media.id, first.media.id)
      await assert.rejects(payload.update({ collection: 'media', id: first.media.id, data: { sourceKey: 'tampered' }, user: owner, overrideAccess: false }), /immuables/)
    })
    await t.test('deux finalisations simultanées restent idempotentes et durables dans SQLite', async () => {
      const current = await startMediaImport(payload, editor, { ...input, name: 'concurrent.png' })
      for (let index = 0; index < Math.ceil(data.length / MEDIA_CHUNK_BYTES); index++) await putMediaChunk(payload, editor, { id: current.id, token: current.token, index, data: data.subarray(index * MEDIA_CHUNK_BYTES, (index + 1) * MEDIA_CHUNK_BYTES) })
      const results = await Promise.allSettled([finalizeMediaImport(payload, editor, { id: current.id, token: current.token }), finalizeMediaImport(payload, editor, { id: current.id, token: current.token })])
      assert.ok(results.some(result => result.status === 'fulfilled'))
      for (const result of results) if (result.status === 'rejected') assert.ok(result.reason instanceof MediaError && result.reason.status === 409)
      const settled = await finalizeMediaImport(payload, editor, { id: current.id, token: current.token })
      assert.equal((await payload.count({ collection: 'media', where: { sourceKey: { equals: `resumable:${current.id}` } } })).totalDocs, 1)
      assert.equal(digest(await readFile(path.join(files, settled.media.filename!))), digest(data))
      const { DatabaseSync } = await import('node:sqlite'); const raw = new DatabaseSync(database, { readOnly: true })
      try { assert.equal((raw.prepare('SELECT count(*) AS total FROM media WHERE source_key = ?').get(`resumable:${current.id}`) as { total: number }).total, 1) } finally { raw.close() }
    })
    await t.test('point focal et recadrage initial génèrent des variantes distinctes en conservant les sources exactes', async () => {
      const red = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: '#ff0000' } }).png().toBuffer()
      const source = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#0000ff' } }).composite([{ input: red, left: 0, top: 0 }]).png().toBuffer()
      const geometry = { name: 'cadrage.png', type: 'image/png', size: source.length, fingerprint: fingerprint(source) }
      const createImage = async (imageEdits: ImageImportEdits) => {
        const session = await startMediaImport(payload, owner, { ...geometry, imageEdits })
        await putMediaChunk(payload, owner, { id: session.id, token: session.token, index: 0, data: source })
        return { session, result: await finalizeMediaImport(payload, owner, { id: session.id, token: session.token }) }
      }
      const left = await createImage({ focalX: 0, focalY: 50 }); const right = await createImage({ focalX: 100, focalY: 50 })
      assert.notEqual(left.session.id, right.session.id)
      for (const result of [left.result, right.result]) assert.equal(digest(await readFile(path.join(files, result.media.filename!))), digest(source))
      assert.equal(left.result.media.focalX, 0); assert.equal(right.result.media.focalX, 100)
      const variant = (url: string) => path.join(files, path.basename(new URL(url, config.serverURL).pathname))
      const leftStats = await sharp(variant(left.result.media.sizes!.card.url!)).stats(); const rightStats = await sharp(variant(right.result.media.sizes!.card.url!)).stats()
      assert.ok(leftStats.channels[0].mean > leftStats.channels[2].mean); assert.ok(rightStats.channels[2].mean > rightStats.channels[0].mean)
      const cropped = await createImage({ focalX: 75, focalY: 50, crop: { x: 25, y: 25, width: 50, height: 50 } })
      assert.equal(cropped.result.media.width, 1200); assert.equal(cropped.result.media.height, 600)
      assert.equal(cropped.result.media.focalX, 100); assert.ok(cropped.result.originalMediaID)
      const original = await payload.findByID({ collection: 'media', id: cropped.result.originalMediaID!, depth: 0, user: owner, overrideAccess: false })
      assert.equal(digest(await readFile(path.join(files, String(original.filename)))), digest(source)); assert.equal(original.visibility, 'restricted')
      assert.match(String(cropped.result.media.authorization), new RegExp(`#${original.id}`))
      assert.equal((await sharp(variant(cropped.result.media.sizes!.mobile.url!)).metadata()).width, 480)
      assert.equal((await finalizeMediaImport(payload, owner, { id: cropped.session.id, token: cropped.session.token })).media.id, cropped.result.media.id)
      assert.equal((await payload.count({ collection: 'media', where: { sourceKey: { equals: `resumable:${cropped.session.id}:original` } } })).totalDocs, 1)
      await assert.rejects(startMediaImport(payload, owner, { ...geometry, resumeID: cropped.session.id, imageEdits: { focalX: 50, focalY: 50 } }), rejected(409))
      await assert.rejects(startMediaImport(payload, owner, { ...geometry, imageEdits: { focalX: 50, focalY: 50, crop: { x: 90, y: 0, width: 20, height: 50 } } }), rejected(400))
    })
    await t.test('un autre éditeur ne peut lire, compléter, reprendre ou annuler la session ; propriétaire autorisé', async () => {
      const privateInput = { ...input, name: 'editor.png', fingerprint: '1'.repeat(64) }
      const current = await startMediaImport(payload, editor, privateInput)
      await assert.rejects(getMediaImport(payload, other, { id: current.id, token: current.token }), rejected(403))
      await assert.rejects(putMediaChunk(payload, other, { id: current.id, token: current.token, index: 0, data: data.subarray(0, MEDIA_CHUNK_BYTES) }), rejected(403))
      await assert.rejects(startMediaImport(payload, other, { ...input, resumeID: current.id }), rejected(403))
      await assert.rejects(cancelMediaImport(payload, other, current.id), rejected(403))
      assert.ok(!(await listMediaImports(payload, other)).imports.some(item => item.id === current.id))
      const reclaimed = await startMediaImport(payload, owner, { ...privateInput, resumeID: current.id }); assert.equal(reclaimed.id, current.id)
      await cancelMediaImport(payload, owner, current.id); assert.equal((await readdir(path.join(imports, current.id))).filter(name => name.endsWith('.part')).length, 0)
    })
    await t.test('types, empreintes, quotas, traversées et expiration sont appliqués réellement', async () => {
      await assert.rejects(startMediaImport(payload, editor, { ...input, name: '../evil.pdf' }), rejected(400))
      await assert.rejects(startMediaImport(payload, editor, { ...input, name: 'evil.exe' }), rejected(400))
      await assert.rejects(startMediaImport(payload, editor, { ...input, size: 513 * 1024 ** 2 }), rejected(413))
      process.env.MEDIA_IMPORT_STORAGE_MAX_BYTES = '1'
      try { await assert.rejects(startMediaImport(payload, editor, { ...input, fingerprint: '2'.repeat(64) }), rejected(413)) } finally { delete process.env.MEDIA_IMPORT_STORAGE_MAX_BYTES }
      const invalid = Buffer.from('This is not a PNG image')
      const bad = await startMediaImport(payload, editor, { name: 'fake.png', type: 'image/png', size: invalid.length, fingerprint: fingerprint(invalid) })
      await putMediaChunk(payload, editor, { id: bad.id, token: bad.token, index: 0, data: invalid })
      await assert.rejects(finalizeMediaImport(payload, editor, { id: bad.id, token: bad.token }), /Image invalide/)
      assert.equal((await getMediaImport(payload, editor, { id: bad.id, token: bad.token })).status, 'failed')
      const wrong = await startMediaImport(payload, editor, { name: 'wrong.pdf', type: 'application/pdf', size: invalid.length, fingerprint: '0'.repeat(64) })
      await putMediaChunk(payload, editor, { id: wrong.id, token: wrong.token, index: 0, data: invalid })
      await assert.rejects(finalizeMediaImport(payload, editor, { id: wrong.id, token: wrong.token }), /empreinte/)
      await assert.rejects(startMediaImport(payload, editor, { ...input, resumeID: wrong.id }), rejected(409))
      const file = path.join(imports, bad.id, 'manifest.json'); const manifest = JSON.parse(await readFile(file, 'utf8')); manifest.expiresAt = '2000-01-01T00:00:00.000Z'; await writeFile(file, JSON.stringify(manifest))
      await assert.rejects(getMediaImport(payload, editor, { id: bad.id, token: bad.token }), rejected(410)); await listMediaImports(payload, editor)
      await assert.rejects(readFile(file), { code: 'ENOENT' })
    })
  } finally {
    if (previousRoot === undefined) delete process.env.MEDIA_IMPORT_ROOT; else process.env.MEDIA_IMPORT_ROOT = previousRoot;
    (payload.db as unknown as { client?: { close: () => void } }).client?.close(); await payload.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => {})
  }
})
