import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateKeyPairSync, randomBytes, verify } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { readSearchConsole, searchConsolePeriod, syncSearchConsole, SearchConsoleError } from '../src/cms/search-console'

test('Search Console : contrat officiel simulé, permissions, reprise persistante et données minimales', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-search-console-'))
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const environment = ['CMS_SEARCH_CONSOLE_DIR', 'CMS_SEARCH_CONSOLE', 'NEXT_PUBLIC_SITE_URL', 'GOOGLE_SEARCH_CONSOLE_PROPERTY', 'GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL', 'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY'] as const
  const previous = Object.fromEntries(environment.map(key => [key, process.env[key]]))
  Object.assign(process.env, { CMS_SEARCH_CONSOLE_DIR: path.join(directory, 'observations'), CMS_SEARCH_CONSOLE: 'disabled', NEXT_PUBLIC_SITE_URL: 'https://mis-prod.fr', GOOGLE_SEARCH_CONSOLE_PROPERTY: 'sc-domain:mis-prod.fr', GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL: 'cms-test@offline-fixture.iam.gserviceaccount.com', GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() })
  const cms = await getPayload({ config: buildConfig({ secret: randomBytes(48).toString('hex'), telemetry: false, logger: { options: { level: 'fatal' } }, onInit: installTransactionQueue, typescript: { autoGenerate: false }, graphQL: { disable: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}` }, push: true, wal: true, busyTimeout: 10000, transactionOptions: { behavior: 'immediate' } }),
    collections: [{ slug: 'pages', trash: true, fields: [{ name: 'path', type: 'text', required: true }, { name: '_status', type: 'select', options: ['draft', 'published'], required: true }] }, { slug: 'submission-limits', fields: [{ name: 'key', type: 'text', unique: true, required: true }, { name: 'expiresAt', type: 'date', required: true }] }],
  }) })
  const owner = { id: 1, role: 'owner' as const }, sales = { id: 2, role: 'sales' as const }, client = { id: 3, role: 'client' as const }
  const page = await cms.create({ collection: 'pages', data: { path: '/institutions', _status: 'published' } })
  await cms.create({ collection: 'pages', data: { path: '/brouillon-prive', _status: 'draft' } })
  const period = { from: '2026-10-01', to: '2026-10-20' }
  let requests = 0
  const never: typeof fetch = async () => { requests++; throw new Error('Aucun accès réseau ne doit avoir lieu') }
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
  const token = (body: RequestInit['body']) => {
    const jwt = new URLSearchParams(String(body)).get('assertion')!, [header, claims, signature] = jwt.split('.')
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'RS256', typ: 'JWT' })
    const data = JSON.parse(Buffer.from(claims, 'base64url').toString())
    assert.equal(data.scope, 'https://www.googleapis.com/auth/webmasters.readonly'); assert.equal(data.aud, 'https://oauth2.googleapis.com/token'); assert.equal(data.exp - data.iat, 3600); assert.equal('sub' in data, false)
    assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')), true)
    return json({ access_token: 'mock-token-never-network', token_type: 'Bearer', expires_in: 3600 })
  }
  const valid = (day = '2026-10-10') => ({ keys: ['https://mis-prod.fr/institutions', 'MOBILE', day], clicks: 3, impressions: 40, position: 2.5 })
  try {
    await t.test('aucun appel sans activation ; rôle et propriété sont contrôlés avant le transport', async () => {
      assert.equal((await readSearchConsole(cms, sales)).available, false)
      await assert.rejects(syncSearchConsole(cms, owner, period, never), /désactivée/)
      process.env.CMS_SEARCH_CONSOLE = 'enabled'
      await assert.rejects(syncSearchConsole(cms, sales, period, never), error => error instanceof SearchConsoleError && error.status === 403)
      await assert.rejects(readSearchConsole(cms, client), /commercial/)
      process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY = 'sc-domain:other-domain.test'
      await assert.rejects(syncSearchConsole(cms, owner, period, never), /exactement/)
      process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY = 'sc-domain:mis-prod.fr'
      assert.equal(requests, 0)
      assert.throws(() => searchConsolePeriod({ from: '2026-10-31', to: '2026-10-01' }), /Choisissez/)
    })
    await t.test('une interruption reprend à la page validée sans doublons, mots-clés ou URL sensible', async () => {
      const interrupted: typeof fetch = async (url, options) => {
        requests++
        assert.equal(options?.redirect, 'error')
        if (String(url) === 'https://oauth2.googleapis.com/token') return token(options?.body)
        assert.equal(String(url), 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Amis-prod.fr/searchAnalytics/query')
        const body = JSON.parse(String(options?.body)); assert.deepEqual(body.dimensions, ['page', 'device', 'date']); assert.equal(body.dataState, 'final'); assert.equal(body.type, 'web'); assert.equal('query' in body, false)
        if (body.startRow === 0) return json({ rows: Array.from({ length: 1000 }, () => valid()) })
        return json({ error: 'private-google-diagnostic@example.test' }, 503)
      }
      await assert.rejects(syncSearchConsole(cms, owner, period, interrupted), /HTTP 503/)
      const failed = (await readSearchConsole(cms, owner)).observation!
      assert.equal(failed.state, 'failed'); assert.equal(failed.nextRow, 1000); assert.equal(failed.rows.length, 1)
      const resumed: typeof fetch = async (url, options) => {
        requests++
        if (String(url) === 'https://oauth2.googleapis.com/token') return token(options?.body)
        assert.equal(JSON.parse(String(options?.body)).startRow, 1000)
        return json({ rows: [valid('2026-10-11'), { ...valid(), keys: ['https://mis-prod.fr/institutions?email=private@example.test', 'MOBILE', '2026-10-11'] }, { ...valid(), keys: ['https://mis-prod.fr/brouillon-prive', 'MOBILE', '2026-10-11'] }, { ...valid(), keys: ['https://outside.test/institutions', 'MOBILE', '2026-10-11'] }] })
      }
      const done = await syncSearchConsole(cms, owner, period, resumed)
      assert.equal(done.observation?.state, 'completed'); assert.equal(done.observation.rows.length, 2); assert.ok(done.observation.completedAt)
      const count = requests
      await syncSearchConsole(cms, owner, period, never)
      assert.equal(requests, count, 'Période terminée : réponse idempotente sans appel Google')
      const files = await readdir(process.env.CMS_SEARCH_CONSOLE_DIR!)
      for (const file of files) {
        const contents = await readFile(path.join(process.env.CMS_SEARCH_CONSOLE_DIR!, file), 'utf8')
        assert.doesNotMatch(contents, /private@example|private-google|mock-token|BEGIN PRIVATE|iam\.gserviceaccount|https:\/\//)
      }
    })
    await t.test('la suppression retire les lignes visibles et deux synchronisations ne partagent pas le bail', async () => {
      await cms.update({ collection: 'pages', id: page.id, data: { deletedAt: new Date().toISOString() } })
      assert.equal((await readSearchConsole(cms, sales)).observation?.rows.length, 0)
      let signalStarted!: () => void, continueToken!: () => void
      const started = new Promise<void>(resolve => { signalStarted = resolve }), blocked = new Promise<void>(resolve => { continueToken = resolve })
      const slow: typeof fetch = async (url, options) => { if (String(url) === 'https://oauth2.googleapis.com/token') { signalStarted(); await blocked; return token(options?.body) } return json({ rows: [] }) }
      const active = syncSearchConsole(cms, owner, { from: '2026-09-01', to: '2026-09-15' }, slow)
      await started
      await assert.rejects(syncSearchConsole(cms, owner, { from: '2026-09-01', to: '2026-09-15' }, never), error => error instanceof SearchConsoleError && error.status === 409)
      continueToken(); assert.equal((await active).observation?.state, 'completed')
    })
  } finally {
    for (const key of environment) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] }
    (cms.db as unknown as { client?: { close: () => void } }).client?.close(); await cms.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => {})
  }
})
