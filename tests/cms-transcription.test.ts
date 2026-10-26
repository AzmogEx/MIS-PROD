import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import { coreCollections } from '../src/cms/collections'
import { clientCollections } from '../src/cms/client-collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { aiCollections, aiSettings } from '../src/cms/ai'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { localWhisperURL, listTranscriptionSources, transcribeFile, transcriptionAvailability, TranscriptionError } from '../src/cms/transcription'
import { transcriptionHandlers } from '../src/cms/transcription-http'

function wav() {
  const buffer = Buffer.alloc(32044); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(32000, 40); return buffer
}
const rejected = (status: number) => (error: unknown) => error instanceof TranscriptionError && error.status === status

test('Transcription : contrat HTTP local, droits réels SQLite, quotas partagés et suggestion privée', async t => {
  const keys = ['WHISPER_BASE_URL', 'WHISPER_MODEL', 'WHISPER_CONVERT_ENABLED', 'WHISPER_MAX_AUDIO_BYTES', 'WHISPER_MAX_AUDIO_SECONDS', 'WHISPER_TIMEOUT_MS'] as const
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  let calls = 0; let mode = 'ok'; let sent: FormData | undefined
  const server = createServer(async (request, response) => {
    calls++
    try {
      const parts: Buffer[] = []; for await (const part of request) parts.push(Buffer.from(part))
      sent = await new Request('http://127.0.0.1/inference', { method: 'POST', headers: { 'Content-Type': request.headers['content-type']! }, body: Buffer.concat(parts) }).formData()
      assert.equal(request.url, '/inference')
      if (mode === 'timeout') return
      if (mode === 'redirect') { response.writeHead(307, { Location: 'https://example.invalid/forbidden' }); response.end(); return }
      if (mode === 'invalid') { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ text: '' })); return }
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ text: 'Bonjour, ceci est une transcription de recette à relire.' }))
    } catch { response.writeHead(500); response.end() }
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  process.env.WHISPER_BASE_URL = `http://127.0.0.1:${address.port}`; process.env.WHISPER_MODEL = 'ggml-small.bin'; process.env.WHISPER_CONVERT_ENABLED = 'true'
  await mkdir('.data', { recursive: true }); const directory = await mkdtemp(path.resolve('.data/test-transcription-')); const publicFiles = path.join(directory, 'media'); const privateFiles = path.join(directory, 'private')
  const config = await buildConfig({ secret: randomBytes(48).toString('hex'), onInit: installTransactionQueue, telemetry: false, sharp, admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false }, localization: { locales: ['fr', 'en'], defaultLocale: 'fr' }, db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'transcription.db').replaceAll('\\', '/')}` }, push: true, transactionOptions: { behavior: 'immediate' } }), collections: [...coreCollections.map(collection => collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: publicFiles } } : collection), ...clientCollections.map(collection => collection.slug === 'private-files' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: privateFiles } } : collection), ...aiCollections, SubmissionLimits], globals: [aiSettings] })
  const payload = await getPayload({ config }); const password = randomBytes(24).toString('hex')
  const owner = { ...await payload.create({ collection: 'users', context: { bootstrap: true }, data: { name: 'Owner', email: 'transcript-owner@example.test', password, role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const editor = { ...await payload.create({ collection: 'users', data: { name: 'Editor', email: 'transcript-editor@example.test', password: randomBytes(24).toString('hex'), role: 'editor' }, user: owner }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const client = { ...await payload.create({ collection: 'users', data: { name: 'Client', email: 'transcript-client@example.test', password: randomBytes(24).toString('hex'), role: 'client' }, user: owner }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const project = await payload.create({ collection: 'projects', data: { title: 'Projet privé', members: [client.id] }, user: owner })
  const source = wav()
  const privateAudio = await payload.create({ collection: 'private-files', data: { title: 'Entretien privé', project: project.id }, file: { data: source, mimetype: 'audio/wav', name: 'entretien.wav', size: source.length }, user: owner })
  const mp3 = Buffer.from([73, 68, 51, 4, 0, 0, 0, 0, 0, 0, 255, 251, 144, 0, 0, 0])
  const publicAudio = await payload.create({ collection: 'media', data: { alt: 'Audio de recette', visibility: 'public' }, file: { data: mp3, mimetype: 'audio/mpeg', name: 'audio.mp3', size: mp3.length }, user: owner })
  await payload.updateGlobal({ slug: 'ai-settings', data: { enabled: true, dailyRequests: 20, monthlyRequests: 200 }, user: owner })
  const input = () => ({ collection: 'private-files' as const, id: Number(privateAudio.id), language: 'fr' as const, requestKey: randomUUID() })
  const handlers = transcriptionHandlers(async () => payload)
  try {
    await t.test('configuration refuse domaine, URL externe, credentials, chemin et modèle cloud', () => {
      const original = process.env.WHISPER_BASE_URL
      for (const url of ['https://example.com', 'http://localhost:8080', 'http://user:pass@127.0.0.1', 'http://127.0.0.1/remote', 'http://127.0.0.1/?url=remote']) { process.env.WHISPER_BASE_URL = url; assert.equal(localWhisperURL(), undefined) }
      process.env.WHISPER_BASE_URL = original; assert.ok(localWhisperURL()); process.env.WHISPER_MODEL = 'cloud-model'; assert.equal(transcriptionAvailability({ enabled: true } as never).available, false); process.env.WHISPER_MODEL = 'ggml-small.bin'
    })
    await t.test('API exige session équipe et origine, refuse corps excessif et référence URL', async () => {
      assert.equal((await handlers.GET(new Request('http://localhost:4496/api/client/transcription'))).status, 401)
      const login = await payload.login({ collection: 'users', data: { email: 'transcript-owner@example.test', password } }); const headers = { Authorization: `JWT ${login.token}`, Origin: 'http://localhost:4496', 'Content-Type': 'application/json' }
      const response = await handlers.GET(new Request('http://localhost:4496/api/client/transcription', { headers })); assert.equal(response.status, 200); assert.equal((await response.json()).files.length, 2)
      assert.equal((await handlers.POST(new Request('http://localhost:4496/api/client/transcription', { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify(input()) }))).status, 403)
      assert.equal((await handlers.POST(new Request('http://localhost:4496/api/client/transcription', { method: 'POST', headers, body: 'x'.repeat(2049) }))).status, 413)
      assert.equal((await handlers.POST(new Request('http://localhost:4496/api/client/transcription', { method: 'POST', headers, body: JSON.stringify({ url: 'https://example.com/audio.wav' }) }))).status, 400)
      await assert.rejects(transcribeFile(payload, client, input()), rejected(403)); await assert.rejects(transcribeFile(payload, editor, input()), rejected(403)); assert.equal((await listTranscriptionSources(payload, editor)).files.length, 1); assert.equal(calls, 0)
    })
    await t.test('fichier privé transmis au seul serveur local et suggestion persistée sans mutation du média', async () => {
      const request = input(); const login = await payload.login({ collection: 'users', data: { email: 'transcript-owner@example.test', password } })
      const response = await handlers.POST(new Request('http://localhost:4496/api/client/transcription', { method: 'POST', headers: { Authorization: `JWT ${login.token}`, Origin: 'http://localhost:4496', 'Content-Type': 'application/json' }, body: JSON.stringify(request) })); assert.equal(response.status, 200); const result = await response.json()
      assert.equal(result.status, 'completed', String(result.error)); assert.equal(result.task, 'transcription'); assert.match(String(result.output), /transcription/); assert.equal(calls, 1)
      assert.equal(sent?.get('language'), 'fr'); assert.equal(sent?.get('response_format'), 'json'); assert.equal(sent?.get('duration'), '900000')
      assert.deepEqual(Buffer.from(await (sent!.get('file') as File).arrayBuffer()), source)
      assert.equal((sent!.get('file') as File).name, 'input.wav')
      assert.equal((await transcribeFile(payload, owner, request)).id, result.id); assert.equal(calls, 1)
      assert.equal((await payload.count({ collection: 'ai-budget-ledger' })).totalDocs, 1)
      assert.equal((await payload.findByID({ collection: 'media', id: publicAudio.id })).transcript, null)
      assert.equal((await payload.find({ collection: 'ai-requests', user: editor, overrideAccess: false })).totalDocs, 0)
      await assert.rejects(transcribeFile(payload, owner, { ...request, language: 'en' }), rejected(409))
    })
    await t.test('fichier retiré, signature falsifiée, taille et durée refusés avant inférence', async () => {
      await payload.update({ collection: 'private-files', id: privateAudio.id, data: { revoked: true }, user: owner }); await assert.rejects(transcribeFile(payload, owner, input()), rejected(403)); await payload.update({ collection: 'private-files', id: privateAudio.id, data: { revoked: false }, user: owner })
      process.env.WHISPER_MAX_AUDIO_BYTES = '100'; await assert.rejects(transcribeFile(payload, owner, input()), rejected(413)); delete process.env.WHISPER_MAX_AUDIO_BYTES
      await payload.update({ collection: 'projects', id: project.id, data: { archived: true }, user: owner }); await assert.rejects(transcribeFile(payload, owner, input()), rejected(403)); assert.equal((await listTranscriptionSources(payload, owner)).files.some(file => file.collection === 'private-files'), false); await payload.update({ collection: 'projects', id: project.id, data: { archived: false }, user: owner })
      const physical = path.join(privateFiles, String(privateAudio.filename)); const corrupt = Buffer.from(source); corrupt.write('EVIL'); await writeFile(physical, corrupt); await assert.rejects(transcribeFile(payload, owner, input()), rejected(400)); await writeFile(physical, source)
      const long = Buffer.alloc(64044); source.copy(long); long.writeUInt32LE(long.length - 8, 4); long.writeUInt32LE(64000, 40); process.env.WHISPER_MAX_AUDIO_SECONDS = '1'; await writeFile(physical, long); await assert.rejects(transcribeFile(payload, owner, input()), rejected(413)); delete process.env.WHISPER_MAX_AUDIO_SECONDS; await writeFile(physical, source)
      const slow = Buffer.from(source); slow.writeUInt32LE(8000, 24); await writeFile(physical, slow); await assert.rejects(transcribeFile(payload, owner, input()), rejected(400)); await writeFile(physical, source)
      await payload.update({ collection: 'media', id: publicAudio.id, data: { rightsUntil: '2000-01-01T00:00:00Z' }, user: owner }); await assert.rejects(transcribeFile(payload, owner, { ...input(), collection: 'media', id: Number(publicAudio.id) }), rejected(403)); await payload.update({ collection: 'media', id: publicAudio.id, data: { rightsUntil: null }, user: owner }); assert.equal(calls, 1)
    })
    await t.test('MP3 public autorisé via conversion explicite ; un doublon concurrent ne double pas l’inférence', async () => {
      process.env.WHISPER_CONVERT_ENABLED = 'false'; const request = { ...input(), collection: 'media', id: Number(publicAudio.id) }; await assert.rejects(transcribeFile(payload, editor, request), rejected(400)); process.env.WHISPER_CONVERT_ENABLED = 'true'
      const results = await Promise.all([transcribeFile(payload, editor, request), transcribeFile(payload, editor, request)]); assert.equal(results[0].id, results[1].id); assert.equal(calls, 2)
      const stored = await payload.findByID({ collection: 'ai-requests', id: results[0].id }); assert.equal(stored.status, 'completed'); assert.equal((await payload.count({ collection: 'ai-budget-ledger' })).totalDocs, 2)
    })
    await t.test('redirection refusée, erreur conservée et absence de relance automatique', async () => {
      mode = 'redirect'; const request = input(); const result = await transcribeFile(payload, owner, request); assert.equal(result.status, 'failed'); assert.equal(calls, 3)
      mode = 'ok'; assert.equal((await transcribeFile(payload, owner, request)).id, result.id); assert.equal(calls, 3)
      mode = 'invalid'; assert.equal((await transcribeFile(payload, owner, input())).status, 'failed'); assert.equal(calls, 4); mode = 'timeout'; process.env.WHISPER_TIMEOUT_MS = '100'; const timed = await transcribeFile(payload, owner, input()); assert.equal(timed.status, 'failed'); assert.match(String(timed.error), /délai/); assert.equal(calls, 5); delete process.env.WHISPER_TIMEOUT_MS; mode = 'ok'
    })
    await t.test('budget quotidien partagé bloque l’inférence et conserve une demande en échec', async () => {
      await payload.updateGlobal({ slug: 'ai-settings', data: { dailyRequests: 5 }, user: owner }); const result = await transcribeFile(payload, owner, input()); assert.equal(result.status, 'failed'); assert.match(String(result.error), /quota quotidien/); assert.equal(calls, 5); assert.equal((await payload.count({ collection: 'ai-budget-ledger' })).totalDocs, 5)
      await payload.updateGlobal({ slug: 'ai-settings', data: { enabled: false }, user: owner }); await assert.rejects(transcribeFile(payload, owner, input()), rejected(503))
    })
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()))
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] }
    ;(payload.db as unknown as { client?: { close(): void } }).client?.close(); await payload.destroy()
    assert.ok(directory.startsWith(path.resolve('.data') + path.sep)); await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => undefined)
  }
})
