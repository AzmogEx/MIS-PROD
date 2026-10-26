import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import type { Payload, PayloadRequest } from 'payload'
import { installTransactionQueue } from '../src/cms/transaction-queue'

let payload: Payload
let directory: string
let owner: NonNullable<PayloadRequest['user']>
let alice: NonNullable<PayloadRequest['user']>
let bob: NonNullable<PayloadRequest['user']>
let projectID: string | number
let fileID: string | number
let deliveryID: string | number
let service: typeof import('../src/cms/client-services')
let ai: typeof import('../src/cms/ai')
let modelServer: Server | undefined
const ownerPassword = randomBytes(24).toString('hex')

before(async () => {
  await mkdir('.cms', { recursive: true })
  directory = await mkdtemp(path.resolve('.cms/test-client-'))
  process.env.CMS_PRIVATE_FILES_DIR = path.join(directory, 'private')
  const [{ getPayload, buildConfig }, { sqliteAdapter }, { clientCollections }, services, aiModule] = await Promise.all([
    import('payload'), import('@payloadcms/db-sqlite'), import('../src/cms/client-collections'), import('../src/cms/client-services'), import('../src/cms/ai'),
  ])
  service = services; ai = aiModule
  const config = buildConfig({
    onInit: installTransactionQueue,
    secret: randomBytes(48).toString('hex'), telemetry: false,
    logger: { options: { level: 'fatal' } },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'client.db').replaceAll('\\', '/')}` }, push: true, transactionOptions: { behavior: 'immediate' }, wal: true, busyTimeout: 10000 }),
    typescript: { autoGenerate: false }, graphQL: { disable: true },
    collections: [
      { slug: 'users', auth: true, fields: [{ name: 'role', type: 'text', required: true }] },
      { slug: 'media', fields: [{ name: 'title', type: 'text' }] },
      ...clientCollections, ...ai.aiCollections,
    ], globals: [ai.aiSettings],
  })
  payload = await getPayload({ config })
  const makeUser = async (name: string, role: string) => ({ ...await payload.create({ collection: 'users', data: { email: `${name}@example.test`, password: name === 'owner' ? ownerPassword : randomBytes(24).toString('hex'), role }, overrideAccess: true }), collection: 'users' })
  owner = await makeUser('owner', 'owner'); alice = await makeUser('alice', 'client'); bob = await makeUser('bob', 'client')
  const project = await payload.create({ collection: 'projects', data: { title: 'Projet de recette isolée', members: [alice.id], status: 'review' }, user: owner, overrideAccess: false })
  projectID = project.id
  const { default: sharp } = await import('sharp')
  const data = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#c9a961' } }).png().toBuffer()
  const file = await payload.create({ collection: 'private-files', data: { title: 'Document de recette', project: projectID, kind: 'delivery' }, file: { data, name: 'recette.png', mimetype: 'image/png', size: data.length }, user: owner, overrideAccess: false })
  fileID = file.id
  const delivery = await payload.create({ collection: 'deliverables', data: { title: 'Film de recette', project: projectID, version: 'V1', file: fileID, duration: 120, clientVisible: true }, user: owner, overrideAccess: false })
  deliveryID = delivery.id
})

after(async () => {
  if (modelServer) { modelServer.closeAllConnections(); await new Promise<void>((resolve) => modelServer!.close(() => resolve())) }
  if (payload) { (payload.db as unknown as { client?: { close: () => void } }).client?.close(); await payload.destroy() }
  // directory is a freshly created, absolute child of this test's .cms root.
  if (directory && directory.startsWith(path.resolve('.cms') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => { /* Windows can retain libSQL handles until process exit; this isolated fixture remains ignored. */ })
})

test('Les projets et leurs versions sont isolés entre deux comptes clients', async () => {
  const own = await payload.find({ collection: 'projects', user: alice, overrideAccess: false })
  const foreign = await payload.find({ collection: 'projects', user: bob, overrideAccess: false })
  assert.equal(own.totalDocs, 1); assert.equal(foreign.totalDocs, 0)
  await assert.rejects(payload.findByID({ collection: 'projects', id: projectID, user: bob, overrideAccess: false }))
  await assert.rejects(payload.findByID({ collection: 'deliverables', id: deliveryID, user: bob, overrideAccess: false }))
  await assert.rejects(payload.findByID({ collection: 'private-files', id: fileID, user: alice, overrideAccess: false }))
})

test('Le téléchargement vérifie appartenance et partage, et supporte Range sans cache public', async () => {
  await assert.rejects(service.getAuthorizedPrivateFile(payload, fileID, bob))
  const file = await service.getAuthorizedPrivateFile(payload, fileID, alice)
  const response = await service.servePrivateFile(new Request('http://localhost/api/client/files/1', { headers: { range: 'bytes=0-7' } }), file)
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0')
  assert.equal((await response.arrayBuffer()).byteLength, 8)
  const { default: sharp } = await import('sharp')
  const data = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#050505' } }).png().toBuffer()
  const hidden = await payload.create({ collection: 'private-files', data: { title: 'Brouillon interne', project: projectID }, file: { data, name: 'interne.png', mimetype: 'image/png', size: data.length }, user: owner, overrideAccess: false })
  await assert.rejects(service.getAuthorizedPrivateFile(payload, hidden.id, alice))
})

test('Auteur et horodatage de commentaire sont imposés, le repère est validé côté serveur', async () => {
  const comment = await payload.create({ collection: 'video-comments', data: { project: projectID, deliverable: deliveryID, author: bob.id, recordedAt: '2000-01-01T00:00:00.000Z', body: 'Retour sur une séquence de test.', timecode: 42 }, user: alice, overrideAccess: false })
  assert.equal(service.relationID(comment.author), alice.id)
  assert.ok(Date.parse(comment.recordedAt) > Date.now() - 60000)
  await assert.rejects(payload.create({ collection: 'video-comments', data: { project: projectID, deliverable: deliveryID, body: 'Hors durée.', timecode: 121 }, user: alice, overrideAccess: false }))
  await assert.rejects(payload.create({ collection: 'video-comments', data: { project: projectID, deliverable: deliveryID, body: 'Tentative hors projet.' }, user: bob, overrideAccess: false }))
})

test('Une acceptation reste liée à V1 lorsque V2 est créée ; versions et décisions sont immuables', async () => {
  const approval = await payload.create({ collection: 'approvals', data: { project: projectID, deliverable: deliveryID, decision: 'accepted' }, user: alice, overrideAccess: false })
  const next = await payload.create({ collection: 'deliverables', data: { title: 'Film de recette', project: projectID, version: 'V2', file: fileID, duration: 120 }, user: owner, overrideAccess: false })
  const persisted = await payload.findByID({ collection: 'approvals', id: approval.id, depth: 0, user: alice, overrideAccess: false })
  assert.equal(service.relationID(persisted.deliverable), deliveryID)
  assert.notEqual(service.relationID(persisted.deliverable), next.id)
  await assert.rejects(payload.update({ collection: 'deliverables', id: deliveryID, data: { version: 'V3' }, user: owner, overrideAccess: false }))
  await assert.rejects(payload.update({ collection: 'approvals', id: approval.id, data: { decision: 'changes_requested' }, user: owner, overrideAccess: false }))
  await assert.rejects(payload.create({ collection: 'approvals', data: { project: projectID, deliverable: deliveryID, decision: 'accepted' }, user: alice, overrideAccess: false }))
})

test('Un remplacement, recadrage ou changement physique refusé conserve les octets du livrable déjà accepté', async () => {
  const { handleEndpoints } = await import('payload')
  const { default: sharp } = await import('sharp')
  const file = await payload.findByID({ collection: 'private-files', id: fileID, depth: 0, user: owner, overrideAccess: false })
  const storedPath = service.privateFilePath(String(file.filename))
  const bytes = await readFile(storedPath)
  assert.equal(file.checksum, createHash('sha256').update(bytes).digest('hex'))
  const accepted = (await payload.find({ collection: 'approvals', where: { deliverable: { equals: deliveryID } }, depth: 0, user: alice, overrideAccess: false })).docs
  assert.equal(accepted.length, 1)
  const token = (await payload.login({ collection: 'users', data: { email: 'owner@example.test', password: ownerPassword } })).token!
  const auth = { Authorization: `JWT ${token}` }
  const replacement = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ef4444' } }).png().toBuffer()
  const form = new FormData(); form.append('file', new Blob([new Uint8Array(replacement)], { type: 'image/png' }), String(file.filename)); form.append('_payload', JSON.stringify({ title: 'Remplacement interdit' }))
  const overwritten = await handleEndpoints({ config: payload.config, request: new Request(`http://localhost:4416/api/private-files/${fileID}`, { method: 'PATCH', headers: auth, body: form }) })
  assert.equal(overwritten.status, 400); await overwritten.arrayBuffer()
  assert.deepEqual(await readFile(storedPath), bytes)
  const cropped = await handleEndpoints({ config: payload.config, request: new Request(`http://localhost:4416/api/private-files/${fileID}?uploadEdits[crop][width]=5&uploadEdits[crop][height]=5`, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Recadrage interdit' }) }) })
  assert.equal(cropped.status, 400); await cropped.arrayBuffer()
  for (const patch of [{ focalX: 10 }, { focalY: 20 }, { checksum: '0'.repeat(64) }]) {
    const response = await handleEndpoints({ config: payload.config, request: new Request(`http://localhost:4416/api/private-files/${fileID}`, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }) })
    assert.equal(response.status, 400); await response.arrayBuffer()
  }
  for (const patch of [{ filename: 'substituted.png' }, { url: '/api/private-files/file/substituted.png' }, { mimeType: 'application/pdf' }, { filesize: 1 }, { sizes: { card: { filename: 'substituted.png' } } }, { checksum: '0'.repeat(64) }]) {
    await assert.rejects(payload.update({ collection: 'private-files', id: fileID, data: patch, user: owner, overrideAccess: true }), /immuables/)
  }
  assert.deepEqual(await readFile(storedPath), bytes)
  const unchanged = await payload.findByID({ collection: 'private-files', id: fileID, depth: 0, user: owner, overrideAccess: false })
  assert.deepEqual(unchanged, file)
  assert.deepEqual((await payload.find({ collection: 'approvals', where: { deliverable: { equals: deliveryID } }, depth: 0, user: alice, overrideAccess: false })).docs, accepted)
  const download = await service.getAuthorizedPrivateFile(payload, fileID, alice)
  assert.equal(download.checksum, file.checksum)
})

test('Archivage, expiration et révocation retirent effectivement l’accès', async () => {
  await payload.update({ collection: 'projects', id: projectID, data: { archived: true }, user: owner, overrideAccess: false })
  await assert.rejects(service.getAuthorizedPrivateFile(payload, fileID, alice))
  await payload.update({ collection: 'projects', id: projectID, data: { archived: false }, user: owner, overrideAccess: false })
  await payload.update({ collection: 'private-files', id: fileID, data: { revoked: true }, user: owner, overrideAccess: false })
  const file = await service.getAuthorizedPrivateFile(payload, fileID, alice)
  assert.equal((await service.servePrivateFile(new Request('http://localhost'), file)).status, 404)
  await payload.update({ collection: 'private-files', id: fileID, data: { revoked: false, expiresAt: '2000-01-01T00:00:00.000Z' }, user: owner, overrideAccess: false })
  const expired = await service.getAuthorizedPrivateFile(payload, fileID, alice)
  assert.equal((await service.servePrivateFile(new Request('http://localhost'), expired)).status, 404)
  await payload.update({ collection: 'private-files', id: fileID, data: { expiresAt: null }, user: owner, overrideAccess: false })
})

test('Portfolio restreint : destinataires et échéance sont appliqués à la lecture', async () => {
  const portfolio = await payload.create({ collection: 'commercial-portfolios', data: { title: 'Sélection privée de recette', members: [alice.id], expiresAt: new Date(Date.now() + 3600000).toISOString(), items: [] }, user: owner, overrideAccess: false })
  assert.ok(await payload.findByID({ collection: 'commercial-portfolios', id: portfolio.id, user: alice, overrideAccess: false }))
  await assert.rejects(payload.findByID({ collection: 'commercial-portfolios', id: portfolio.id, user: bob, overrideAccess: false }))
  await payload.update({ collection: 'commercial-portfolios', id: portfolio.id, data: { revoked: true }, user: owner, overrideAccess: false })
  await assert.rejects(payload.findByID({ collection: 'commercial-portfolios', id: portfolio.id, user: alice, overrideAccess: false }))
})

test('Jetons de partage, chemins et dates ne permettent pas de contournement', () => {
  const first = service.newShareToken(); const second = service.newShareToken()
  assert.notEqual(first.token, second.token)
  assert.equal(first.hash, service.tokenDigest(first.token))
  assert.equal(first.token.length, 43)
  assert.throws(() => service.privateFilePath('../secret'))
  assert.throws(() => service.privateFilePath('folder\\secret'))
  assert.equal(service.isUnexpired('invalid'), false)
  assert.equal(service.isUnexpired('2025-01-01', Date.parse('2026-01-01')), false)
  assert.throws(() => service.requireSameOrigin(new Request('https://mis-prod.fr/api/client', { headers: { origin: 'https://attacker.example' } })))
})

test('CSRF : Host navigateur et origine canonique HTTPS sont acceptés, origine et forwarded-host hostiles refusés', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://mis-prod.fr'
  const request = (headers: Record<string, string>) => new Request('http://localhost:3100/api/editor/1', { method: 'POST', headers })
  try {
    assert.doesNotThrow(() => service.requireSameOrigin(request({ Host: '127.0.0.1:3100', Origin: 'http://127.0.0.1:3100', 'Sec-Fetch-Site': 'same-origin' })))
    assert.doesNotThrow(() => service.requireSameOrigin(request({ Host: 'localhost:3100', Origin: 'http://localhost:3100', 'Sec-Fetch-Site': 'same-origin' })))
    assert.doesNotThrow(() => service.requireSameOrigin(request({ Host: 'mis-prod.fr', Origin: 'https://mis-prod.fr', 'Sec-Fetch-Site': 'same-origin' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: '127.0.0.1:3100', Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'same-site' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: '127.0.0.1:3100', Origin: 'https://attacker.example', 'X-Forwarded-Host': 'attacker.example', 'X-Forwarded-Proto': 'https' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: 'mis-prod.fr', Origin: 'https://mis-prod.fr', 'Sec-Fetch-Site': 'cross-site' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: 'mis-prod.fr', 'Sec-Fetch-Site': 'cross-site' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: 'mis-prod.fr', Origin: 'null' })))
    assert.throws(() => service.requireSameOrigin(request({ Host: 'attacker.example/path', Origin: 'https://mis-prod.fr' })))
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previous
  }
})

test('IA : désactivation, restriction boucle locale et quotas persistants ; aucun fournisseur externe', async () => {
  const config = { enabled: true, model: 'mis-test-local', dailyRequests: 1, monthlyRequests: 2, maxInputCharacters: 1000, maxOutputTokens: 128 }
  process.env.OLLAMA_BASE_URL = 'https://external.example'
  assert.equal(ai.aiAvailability(config).available, false)
  assert.equal(ai.aiAvailability({ ...config, enabled: false }).available, false)
  let generations = 0
  modelServer = createServer((request, response) => {
    request.resume()
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/api/tags') response.end(JSON.stringify({ models: [{ name: 'mis-test-local' }] }))
    else { generations++; response.end(JSON.stringify({ response: 'Suggestion de test à relire.', prompt_eval_count: 20, eval_count: 12 })) }
  })
  await new Promise<void>((resolve) => modelServer!.listen(0, '127.0.0.1', () => resolve()))
  const address = modelServer.address()
  assert.ok(address && typeof address === 'object')
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${address.port}`
  const localProbe = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`)
  assert.equal(localProbe.status, 200)
  await localProbe.text()
  await payload.updateGlobal({ slug: 'ai-settings', data: config, overrideAccess: true })
  const input = { task: 'description' as const, text: 'Texte de recette public sans information personnelle.', requestKey: randomBytes(20).toString('hex') }
  await assert.rejects(ai.generateAISuggestion(payload, alice, input))
  const result = await ai.generateAISuggestion(payload, owner, input)
  assert.equal(result.status, 'completed', String(result.error || ''))
  const replay = await ai.generateAISuggestion(payload, owner, input)
  assert.equal(replay.id, result.id)
  const limited = await ai.generateAISuggestion(payload, owner, { ...input, requestKey: randomBytes(20).toString('hex') })
  assert.equal(limited.status, 'failed')
  assert.match(String(limited.error), /quota quotidien/)
  assert.equal(generations, 1)
})
