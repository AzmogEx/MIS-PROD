/** Optional acceptance check against a real local model and the public whisper.cpp JFK sample. Never run by seed or CI. */
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { buildConfig, getPayload, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import sharp from 'sharp'

const toolDirectory = path.resolve('.data/local-tools/whisper-b5454')
const provenance = JSON.parse(await readFile(path.join(toolDirectory, 'provenance.json'), 'utf8')) as {
  release: string; archiveSHA256: string; modelSource: string; modelSHA256: string; modelBytes: number;
  sampleSource: string; sampleSHA256: string; sampleBytes: number;
}
assert.equal(provenance.release, 'https://github.com/ggml-org/whisper.cpp/releases/tag/b5454')
assert.equal(provenance.modelSource, 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin')
assert.equal(provenance.sampleSource, 'https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.5/samples/jfk.wav')
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const model = await readFile(path.join(toolDirectory, 'ggml-tiny.bin'))
const sample = await readFile(path.join(toolDirectory, 'jfk.wav'))
assert.equal(sha256(model), provenance.modelSHA256); assert.equal(model.length, provenance.modelBytes)
assert.equal(sha256(sample), provenance.sampleSHA256); assert.equal(sample.length, provenance.sampleBytes)
assert.equal(sha256(await readFile(path.join(toolDirectory, 'whisper-bin-x64.zip'))), provenance.archiveSHA256)

await mkdir('.data/tests', { recursive: true })
const directory = await mkdtemp(path.resolve('.data/tests/whisper-real-'))
const database = path.join(directory, 'cms.db')
process.env.CMS_MEDIA_DIR = path.join(directory, 'media')
process.env.CMS_PRIVATE_FILES_DIR = path.join(directory, 'private')
process.env.WHISPER_BASE_URL = 'http://127.0.0.1:8089'
process.env.WHISPER_MODEL = 'ggml-tiny.bin'
process.env.WHISPER_CONVERT_ENABLED = 'false'
process.env.WHISPER_MAX_AUDIO_SECONDS = '30'
process.env.WHISPER_TIMEOUT_MS = '120000'
const [{ coreCollections }, { clientCollections }, { SubmissionLimits }, { aiCollections, aiSettings }, { installTransactionQueue }, { transcribeFile, TranscriptionError }, { transcriptionHandlers }] = await Promise.all([
  import('../src/cms/collections'), import('../src/cms/client-collections'), import('../src/cms/operation-collections'),
  import('../src/cms/ai'), import('../src/cms/transaction-queue'), import('../src/cms/transcription'), import('../src/cms/transcription-http'),
])
const cms = await getPayload({ config: buildConfig({
  secret: randomBytes(48).toString('hex'), onInit: installTransactionQueue, telemetry: false, sharp,
  admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false },
  localization: { locales: ['fr', 'en'], defaultLocale: 'fr' },
  db: sqliteAdapter({ client: { url: `file:${database.replaceAll('\\', '/')}` }, push: true, transactionOptions: { behavior: 'immediate' } }),
  collections: [...coreCollections, ...clientCollections, ...aiCollections, SubmissionLimits], globals: [aiSettings],
}) })

let report: Record<string, unknown> | undefined
try {
  const password = randomBytes(32).toString('hex')
  const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { name: 'Recette locale', email: 'whisper-owner@example.test', password, role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const client = { ...await cms.create({ collection: 'users', data: { name: 'Recette accès client', email: 'whisper-client@example.test', password: randomBytes(32).toString('hex'), role: 'client' }, user: owner }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const project = await cms.create({ collection: 'projects', data: { title: 'Échantillon public — recette locale', members: [client.id] }, user: owner })
  const file = await cms.create({ collection: 'private-files', data: { title: 'JFK — échantillon public whisper.cpp', project: project.id }, file: { data: sample, name: 'jfk-public-sample.wav', mimetype: 'audio/wav', size: sample.length }, user: owner })
  await cms.updateGlobal({ slug: 'ai-settings', data: { enabled: true, dailyRequests: 2, monthlyRequests: 2 }, user: owner })
  const input = { collection: 'private-files' as const, id: Number(file.id), language: 'en' as const, requestKey: randomUUID() }
  await assert.rejects(transcribeFile(cms, client, input), error => error instanceof TranscriptionError && error.status === 403)
  assert.equal((await cms.count({ collection: 'ai-requests' })).totalDocs, 0)
  const handlers = transcriptionHandlers(async () => cms)
  assert.equal((await handlers.GET(new Request('http://127.0.0.1:8089/api/client/transcription'))).status, 401)
  const login = await cms.login({ collection: 'users', data: { email: String(owner.email), password } })
  const started = Date.now()
  const response = await handlers.POST(new Request('http://127.0.0.1:8089/api/client/transcription', {
    method: 'POST', headers: { Authorization: `JWT ${login.token}`, Origin: 'http://127.0.0.1:8089', 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }))
  assert.equal(response.status, 200)
  const result = await response.json() as { id: number; status: string; output?: string; error?: string }
  assert.equal(result.status, 'completed', result.error)
  assert.match(String(result.output), /country/i)
  assert.match(String(result.output), /ask/i)
  const elapsedMs = Date.now() - started
  const repeated = await transcribeFile(cms, owner, input)
  assert.equal(repeated.id, result.id)
  assert.equal((await cms.count({ collection: 'ai-requests' })).totalDocs, 1)
  assert.equal((await cms.count({ collection: 'ai-budget-ledger' })).totalDocs, 1)
  await assert.rejects(cms.find({ collection: 'ai-requests', user: client, overrideAccess: false }), error => (error as { status?: number }).status === 403)
  const upload = cms.collections['private-files'].config.upload
  assert.ok(upload && upload.staticDir)
  assert.equal(sha256(await readFile(path.join(upload.staticDir, String(file.filename)))), provenance.sampleSHA256)
  report = {
    provider: 'whisper.cpp local', endpoint: process.env.WHISPER_BASE_URL,
    model: 'ggml-tiny.bin', ...provenance, observedAt: new Date().toISOString(), elapsedMs,
    input: 'Échantillon public JFK fourni par whisper.cpp, WAV PCM 16 kHz ; aucune donnée client réelle.',
    status: result.status, output: result.output, privateSourceUnchanged: true, deniedClient: true, deniedAnonymous: true,
    repeatedRequestSameID: repeated.id === result.id, durableRequests: 1, quotaReservations: 1,
    database: path.relative(process.cwd(), database),
    limits: 'Un extrait anglais public seulement ; ce contrôle ne certifie pas la qualité française, les contenus longs, la conversion MP3/MP4, ni les performances en charge. Aucun sous-titre ou contenu publié automatiquement.',
  }
} finally { await cms.destroy() }

// Re-open the file in a new process to prove durability beyond the Payload connection.
const durable = spawnSync(process.execPath, ['--input-type=module', '-e', "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(process.argv[1], {readOnly:true}); console.log(JSON.stringify({requests:db.prepare('SELECT count(*) AS total FROM ai_requests').get().total, completed:db.prepare(\"SELECT count(*) AS total FROM ai_requests WHERE status = 'completed'\").get().total, ledger:db.prepare('SELECT count(*) AS total FROM ai_budget_ledger').get().total})); db.close()", database], { encoding: 'utf8', windowsHide: true })
assert.equal(durable.status, 0, durable.stderr)
assert.deepEqual(JSON.parse(durable.stdout), { requests: 1, completed: 1, ledger: 1 })
await mkdir('docs/cms/preuves', { recursive: true })
await writeFile('docs/cms/preuves/transcription-locale.json', JSON.stringify({ ...report, independentProcessDurability: true }, null, 2) + '\n')
console.log(JSON.stringify({ status: report!.status, elapsedMs: report!.elapsedMs, proof: 'docs/cms/preuves/transcription-locale.json', independentProcessDurability: true }))
