import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { buildConfig, getPayload, handleEndpoints, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { ImageOptimizerCache } from 'next/dist/server/image-optimizer.js'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config.js'
import nextConfig from '../next.config'
import { coreCollections } from '../src/cms/collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { installTransactionQueue } from '../src/cms/transaction-queue'

test('Sécurité intégrée : bootstrap, frontières propriétaire et révocation des médias', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-security-'))
  process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
  const config = await buildConfig({
    onInit: installTransactionQueue,
    secret: process.env.PAYLOAD_SECRET, telemetry: false, admin: { disable: true }, sharp,
    serverURL: 'http://localhost:4414', typescript: { autoGenerate: false }, graphQL: { disable: true },
    localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true },
    logger: { options: { level: 'fatal' } },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
    collections: [...coreCollections.map(collection => collection.slug === 'media' ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), staticDir: path.join(directory, 'files') } } : collection), SubmissionLimits],
  })
  const cms = await getPayload({ config })
  type User = NonNullable<PayloadRequest['user']>
  let owner: User, admin: User, client: User
  let adminToken: string, ownerToken: string
  const ownerPassword = randomBytes(25).toString('hex')
  const adminPassword = randomBytes(25).toString('hex')
  const account = (email: string, role: string, password = randomBytes(25).toString('hex')) => ({ email, name: 'Compte de recette isolée', role, password })
  const rest = (route: string, method: string, data?: unknown, token?: string, extra: Record<string, string> = {}) => handleEndpoints({ config, request: new Request(`${config.serverURL}/api${route}`, { method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `JWT ${token}` } : {}), ...extra }, ...(data ? { body: JSON.stringify(data) } : {}) }) })
  async function forbidden(response: Response) { assert.ok(response.status >= 400, `Réponse interdite attendue, reçu ${response.status}`); await response.arrayBuffer() }

  try {
    await t.test('Host localhost, absence de Host et JSON bootstrap ne créent jamais le premier propriétaire par HTTP', async () => {
      for (const host of ['localhost:4414', '127.0.0.1:4414', undefined]) {
        await forbidden(await rest('/users/first-register?context[bootstrap]=true', 'POST', { ...account('attacker@example.test', 'owner'), context: { bootstrap: true } }, undefined, host ? { Host: host } : {}))
        assert.equal((await cms.count({ collection: 'users' })).totalDocs, 0)
      }
      await assert.rejects(cms.create({ collection: 'users', data: account('unguarded@example.test', 'owner'), overrideAccess: true }), /cms:owner/)
      await assert.rejects(cms.create({ collection: 'users', data: account('forged@example.test', 'owner'), context: { bootstrap: true }, req: { payloadAPI: 'REST' }, overrideAccess: true }), /cms:owner/)
      owner = { ...await cms.create({ collection: 'users', data: account('owner-security@example.test', 'owner', ownerPassword), context: { bootstrap: true }, overrideAccess: true }), collection: 'users' } as User
      assert.equal(owner.role, 'owner')
      await assert.rejects(cms.create({ collection: 'users', data: account('second-bootstrap@example.test', 'owner'), context: { bootstrap: true }, overrideAccess: true }), /cms:owner/)
      admin = { ...await cms.create({ collection: 'users', data: account('admin-security@example.test', 'admin', adminPassword), user: owner, overrideAccess: false }), collection: 'users' } as User
      client = { ...await cms.create({ collection: 'users', data: account('client-security@example.test', 'client'), user: owner, overrideAccess: false }), collection: 'users' } as User
      adminToken = (await cms.login({ collection: 'users', data: { email: admin.email!, password: adminPassword } })).token!
      ownerToken = (await cms.login({ collection: 'users', data: { email: owner.email!, password: ownerPassword } })).token!
    })

    await t.test('admin ne peut nommer un propriétaire ni prendre son compte via email ou password', async () => {
      await forbidden(await rest('/users', 'POST', account('promoted-create@example.test', 'owner'), adminToken))
      await forbidden(await rest(`/users/${admin.id}`, 'PATCH', { role: 'owner' }, adminToken))
      await forbidden(await rest(`/users/${client.id}`, 'PATCH', { role: 'owner' }, adminToken))
      for (const patch of [{ email: 'stolen@example.test' }, { password: randomBytes(25).toString('hex') }, { name: 'Modification non autorisée' }, { role: 'admin' }]) {
        await forbidden(await rest(`/users/${owner.id}`, 'PATCH', patch, adminToken))
        await assert.rejects(cms.update({ collection: 'users', id: owner.id, data: patch, user: admin, overrideAccess: true }), /propriétaire/)
      }
      await assert.rejects(cms.update({ collection: 'users', id: admin.id, data: { role: 'owner' }, user: admin, overrideAccess: true }), /propriétaire/)
      await assert.rejects(cms.update({ collection: 'users', id: client.id, data: { role: 'admin' }, user: client, overrideAccess: true }), /rôle/)
      await assert.rejects(cms.update({ collection: 'users', id: owner.id, data: { email: 'bypass@example.test' }, context: { bootstrap: true, ownerRecovery: true }, overrideAccess: true }), /propriétaire/)
      assert.equal((await cms.findByID({ collection: 'users', id: owner.id })).email, owner.email)
      assert.equal((await cms.findByID({ collection: 'users', id: admin.id })).role, 'admin')
      const allowed = await rest(`/users/${client.id}`, 'PATCH', { role: 'editor' }, adminToken)
      assert.equal(allowed.status, 200); await allowed.arrayBuffer()
      await assert.rejects(cms.delete({ collection: 'users', id: owner.id, user: admin, overrideAccess: true }), /propriétaire/)
    })

    await t.test('continuité propriétaire : récupération réelle, promotion autorisée et dernier propriétaire conservé', async () => {
      const token = await cms.forgotPassword({ collection: 'users', data: { email: owner.email! }, disableEmail: true })
      assert.ok(token)
      const newPassword = randomBytes(25).toString('hex')
      const recovered = await cms.resetPassword({ collection: 'users', data: { token: token!, password: newPassword }, overrideAccess: false })
      assert.ok(recovered.token)
      const oldSession = await cms.auth({ headers: new Headers({ Authorization: `JWT ${ownerToken}` }) })
      assert.equal(oldSession.user, null)
      assert.ok((await cms.login({ collection: 'users', data: { email: owner.email!, password: newPassword } })).token)
      await assert.rejects(cms.update({ collection: 'users', id: owner.id, data: { role: 'admin' }, user: owner, overrideAccess: false }), /dernier propriétaire/)
      await assert.rejects(cms.delete({ collection: 'users', id: owner.id, user: owner, overrideAccess: false }), /dernier propriétaire/)
      const promoted = await cms.update({ collection: 'users', id: admin.id, data: { role: 'owner' }, user: owner, overrideAccess: false })
      assert.equal(promoted.role, 'owner')
      await cms.update({ collection: 'users', id: admin.id, data: { role: 'admin' }, user: owner, overrideAccess: false })
    })

    await t.test('les notes internes ne sortent ni dans les API publiques ni dans les relations de page', async () => {
      const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#c9a961' } }).png().toBuffer()
      const rightsUntil = '2100-01-01T00:00:00.000Z'
      const media = await cms.create({ collection: 'media', user: owner, overrideAccess: false, file: { data: buffer, name: 'metadata.png', mimetype: 'image/png', size: buffer.length }, data: { alt: 'Image publique', visibility: 'public', authorization: 'INTERNAL-AUTHORIZATION-RECETTE', sourceKey: 'INTERNAL-MEDIA-KEY', credit: 'Crédit public', rightsUntil } })
      const page = await cms.create({ collection: 'pages', user: owner, overrideAccess: false, data: { title: 'Page publique', path: '/security-metadata', sourceKey: 'INTERNAL-PAGE-KEY', provenance: 'INTERNAL-PROVENANCE-RECETTE', _status: 'published', layout: [{ blockType: 'editorial', title: 'Image publique', media: media.id }] } })
      const publicMediaResponse = await rest(`/media/${media.id}`, 'GET')
      assert.equal(publicMediaResponse.status, 200)
      const publicMedia = await publicMediaResponse.json()
      assert.equal(publicMedia.authorization, undefined); assert.equal(publicMedia.sourceKey, undefined)
      assert.equal(publicMedia.credit, 'Crédit public'); assert.equal(publicMedia.rightsUntil, rightsUntil)
      const publicPageResponse = await rest(`/pages/${page.id}?depth=3`, 'GET')
      assert.equal(publicPageResponse.status, 200)
      const publicPage = await publicPageResponse.json()
      assert.equal(publicPage.sourceKey, undefined); assert.equal(publicPage.provenance, undefined)
      assert.equal(publicPage.layout[0].media.id, media.id)
      assert.ok(!JSON.stringify(publicPage).includes('INTERNAL-'), 'Les relations peuplées doivent aussi filtrer les champs privés')
      for (const route of [`/media/${media.id}?select[authorization]=true&select[sourceKey]=true`, `/pages/${page.id}?select[provenance]=true&select[sourceKey]=true`]) {
        const response = await rest(route, 'GET'); assert.equal(response.status, 200)
        assert.ok(!(await response.text()).includes('INTERNAL-'), 'select ne doit pas contourner les droits de champ')
      }
      const staffMedia = await (await rest(`/media/${media.id}`, 'GET', undefined, adminToken)).json()
      assert.equal(staffMedia.authorization, 'INTERNAL-AUTHORIZATION-RECETTE'); assert.equal(staffMedia.sourceKey, 'INTERNAL-MEDIA-KEY')
      const staffPage = await (await rest(`/pages/${page.id}`, 'GET', undefined, adminToken)).json()
      assert.equal(staffPage.provenance, 'INTERNAL-PROVENANCE-RECETTE'); assert.equal(staffPage.sourceKey, 'INTERNAL-PAGE-KEY')
      const password = randomBytes(25).toString('hex')
      await cms.create({ collection: 'users', user: owner, overrideAccess: false, data: account('sales-security@example.test', 'sales', password) })
      const token = (await cms.login({ collection: 'users', data: { email: 'sales-security@example.test', password } })).token!
      const salesMedia = await (await rest(`/media/${media.id}`, 'GET', undefined, token)).json()
      assert.equal(salesMedia.authorization, 'INTERNAL-AUTHORIZATION-RECETTE')
      const salesPage = await (await rest(`/pages/${page.id}`, 'GET', undefined, token)).json()
      assert.equal(salesPage.provenance, undefined); assert.equal(salesPage.sourceKey, undefined)
    })

    await t.test('originaux et variantes : no-store sur GET/Range, contrôle à chaque retrait et expiration', async () => {
      const buffer = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#c9a961' } }).png().toBuffer()
      const file = await cms.create({ collection: 'media', user: owner, overrideAccess: false, file: { data: buffer, name: 'security.png', mimetype: 'image/png', size: buffer.length }, data: { alt: 'Image isolée', visibility: 'public' } })
      const urls = [file.url, file.sizes.card.url] as string[]
      for (const url of urls) {
        const full = await handleEndpoints({ config, request: new Request(new URL(url, config.serverURL)) })
        assert.equal(full.status, 200); assert.equal(full.headers.get('Cache-Control'), 'private, no-store, max-age=0'); assert.equal(full.headers.get('X-Content-Type-Options'), 'nosniff'); await full.arrayBuffer()
        const range = await handleEndpoints({ config, request: new Request(new URL(url, config.serverURL), { headers: { Range: 'bytes=0-7' } }) })
        assert.equal(range.status, 206); assert.match(range.headers.get('Cache-Control')!, /no-store/); assert.equal((await range.arrayBuffer()).byteLength, 8)
      }
      await cms.update({ collection: 'media', id: file.id, data: { visibility: 'restricted' }, user: owner, overrideAccess: false })
      for (const url of urls) await forbidden(await handleEndpoints({ config, request: new Request(new URL(url, config.serverURL)) }))
      await cms.update({ collection: 'media', id: file.id, data: { visibility: 'public', rightsUntil: '2000-01-01T00:00:00.000Z' }, user: owner, overrideAccess: false })
      for (const url of urls) await forbidden(await handleEndpoints({ config, request: new Request(new URL(url, config.serverURL), { headers: { Range: 'bytes=0-7' } }) }))
    })

    await t.test('le validateur réel Next refuse toute mise en cache des routes CMS, privée et partagée', () => {
      const images = { ...imageConfigDefault, ...nextConfig.images }
      const validate = (url: string) => ImageOptimizerCache.validateParams({ headers: {} } as Parameters<typeof ImageOptimizerCache.validateParams>[0], { url, w: '640', q: '75' }, { ...nextConfig, images } as Parameters<typeof ImageOptimizerCache.validateParams>[2], false)
      for (const url of ['/api/media/file/security.png', '/api/media/file/security-800x600.webp', '/api/private-files/file/master.png', '/api/client/shared/token', '/api/client/files/1', '/universes/../api/media/file/security.png', 'http://localhost:4414/api/media/file/security.png']) {
        assert.ok('errorMessage' in validate(url), `Le cache Next doit refuser ${url}`)
      }
      assert.ok(!('errorMessage' in validate('/universes/institutions.webp')))
      assert.ok('errorMessage' in validate('/universes/institutions.webp?redirect=/api/media/file/security.png'))
    })
  } finally {
    (cms.db as unknown as { client?: { close: () => void } }).client?.close(); await cms.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => { /* Windows may briefly retain an isolated SQLite handle. */ })
  }
})
