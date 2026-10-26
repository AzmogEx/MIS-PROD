import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdir, readdir } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { buildConfig, getPayload, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { operationCollections } from '../src/cms/operation-collections'
import { getPublishedForm, getOperationsSnapshot, seedOperations, submitBrief, processNotificationOutbox, SubmissionError } from '../src/cms/operations'
import { storeBriefUpload, readBriefFile, readBriefUploadBody, purgeExpiredBriefUploads } from '../src/cms/brief-files'

test('Pièces jointes de briefs : vrai fichier privé et SQLite, droits, reprise et conservation', async t => {
  const directory = path.resolve('.data/tests/brief-files-' + randomUUID())
  await mkdir(directory, { recursive: true })
  process.env.CMS_BRIEF_FILES_DIR = path.join(directory, 'files')
  process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
  const payload = await getPayload({ config: buildConfig({ secret: process.env.PAYLOAD_SECRET, telemetry: false, admin: { disable: true }, typescript: { autoGenerate: false }, graphQL: { disable: true },
    db: sqliteAdapter({ client: { url: 'file:' + path.join(directory, 'cms.db').replaceAll('\\', '/') }, push: true, busyTimeout: 10000, transactionOptions: { behavior: 'immediate' } }),
    collections: [{ slug: 'users', auth: true, fields: [{ name: 'role', type: 'text' }, { name: 'name', type: 'text' }] }, ...operationCollections],
    email: () => ({ name: 'test', defaultFromName: 'Test', defaultFromAddress: 'test@example.test', sendEmail: async () => ({}) }),
  }) })
  try {
    await seedOperations(payload)
    const originalForm = (await payload.find({ collection: 'forms', where: { slug: { equals: 'brief-projet' } }, limit: 1 })).docs[0]
    await payload.update({ collection: 'forms', id: originalForm.id, data: { fields: [...originalForm.fields, { key: 'reference', label: 'Cahier de référence', type: 'file', step: 'projet', required: false }], _status: 'published' } })
    const form = (await getPublishedForm(payload))!
    const owner = { ...await payload.create({ collection: 'users', data: { email: 'files-owner@example.test', password: randomBytes(24).toString('hex'), role: 'owner', name: 'Test fichiers' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#227744' } }).png().toBuffer()
    const submissionKey = randomUUID()
    const input = { formSlug: form.slug, field: 'reference', submissionKey, uploadKey: randomUUID(), name: 'reference.png', mimeType: 'image/png', bytes, rateKey: 'files-' + randomUUID() }
    let token = '', briefID = ''

    await t.test('upload valide immuable, reprise identique sans doublon, signatures et limites', async () => {
      const saved = await storeBriefUpload(payload, input); token = saved.token
      assert.match(token, /^bf_[a-f0-9]{64}$/)
      const repeated = await storeBriefUpload(payload, input)
      assert.equal(repeated.token, token); assert.equal(repeated.duplicate, true)
      assert.equal((await readdir(process.env.CMS_BRIEF_FILES_DIR!)).filter(name => name.endsWith('.json')).length, 1)
      await assert.rejects(() => storeBriefUpload(payload, { ...input, bytes: Buffer.from('other') }), error => error instanceof SubmissionError && error.status === 409)
      await assert.rejects(() => storeBriefUpload(payload, { ...input, uploadKey: randomUUID(), bytes: Buffer.from('<svg>not png</svg>') }), error => error instanceof SubmissionError && error.status === 415)
      await assert.rejects(() => readBriefUploadBody(new Request('http://localhost/api/brief-files', { method: 'POST', headers: { 'content-length': String(11 * 1024 * 1024) }, body: 'tiny' })), error => error instanceof SubmissionError && error.status === 413)
      await assert.rejects(() => storeBriefUpload(payload, { ...input, field: 'name' }), /formulaire publié/)
    })
    const body = { formSlug: form.slug, answers: { universe: 'entreprises', message: 'Projet test de pièce jointe privée.', name: 'Recette fichier', email: 'test@example.test', reference: '' } }
    await t.test('liaison formulaire/champ/clé, réception durable et répétition sans doublon', async () => {
      body.answers.reference = token
      await assert.rejects(() => submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: randomUUID() }), error => error instanceof SubmissionError && error.status === 422)
      assert.equal((await submitBrief(payload, { body, idempotencyKey: submissionKey, rateKey: randomUUID() })).duplicate, false)
      assert.equal((await submitBrief(payload, { body, idempotencyKey: submissionKey, rateKey: randomUUID() })).duplicate, true)
      const brief = (await payload.find({ collection: 'briefs', limit: 1 })).docs[0]; briefID = String(brief.id)
      assert.equal(brief.answers.reference, token)
      assert.equal(brief.schemaSnapshot.fields.find((field: { key: string }) => field.key === 'reference').type, 'file')
      assert.equal((await payload.count({ collection: 'briefs' })).totalDocs, 1)
    })
    await t.test('téléchargement autorisé uniquement au CRM, rôles interdits et référence connue', async () => {
      assert.deepEqual((await readBriefFile(payload, owner, briefID, 'reference')).bytes, bytes)
      for (const role of ['client', 'editor', 'contributor']) await assert.rejects(() => readBriefFile(payload, { ...owner, role }, briefID, 'reference'), error => error instanceof SubmissionError && error.status === 403)
      await assert.rejects(() => readBriefFile(payload, null, briefID, 'reference'), error => error instanceof SubmissionError && error.status === 401)
      await assert.rejects(() => readBriefFile(payload, owner, briefID, '../../secret'), error => error instanceof SubmissionError && error.status === 404)
      const snapshot = await getOperationsSnapshot(payload, owner, new URLSearchParams())
      assert.deepEqual(snapshot.briefs[0].attachments, [{ label: 'Cahier de référence', href: `/api/brief-files/${briefID}/reference` }])
    })
    await t.test('échec email sans perte de pièce jointe, reprise unique sans divulgation du token', async () => {
      const failed = await processNotificationOutbox(payload, { send: async () => { throw new Error('Panne test email') } })
      assert.equal(failed.failed, 1)
      assert.deepEqual((await readBriefFile(payload, owner, briefID, 'reference')).bytes, bytes)
      const notification = (await payload.find({ collection: 'notifications', limit: 1 })).docs[0]
      assert.equal(notification.body.includes(token), false)
      assert.match(notification.body, /disponible dans le CRM/)
      await payload.update({ collection: 'notifications', id: notification.id, data: { nextAttemptAt: new Date(0).toISOString() } })
      let sent = 0
      const transport = { send: async () => { sent += 1; return { providerId: 'private-local-test', captured: true } } }
      await processNotificationOutbox(payload, transport); await processNotificationOutbox(payload, transport)
      assert.equal(sent, 1)
    })
    await t.test('schéma ancien lisible après modification ; ménage des seuls fichiers abandonnés', async () => {
      await payload.update({ collection: 'forms', id: form.id!, data: { fields: form.fields.map(field => field.key === 'reference' ? { ...field, label: 'Nouveau libellé' } : field), _status: 'published' } })
      assert.deepEqual((await readBriefFile(payload, owner, briefID, 'reference')).bytes, bytes)
      const orphan = await storeBriefUpload(payload, { ...input, uploadKey: randomUUID() })
      const future = new Date(Date.now() + 3 * 86_400_000)
      assert.equal((await purgeExpiredBriefUploads(payload, future)).deleted, 1)
      assert.equal((await readdir(process.env.CMS_BRIEF_FILES_DIR!)).includes(`${orphan.token}.json`), false)
      assert.deepEqual((await readBriefFile(payload, owner, briefID, 'reference')).bytes, bytes)
      await payload.update({ collection: 'briefs', id: briefID, data: { deletedAt: new Date().toISOString() } })
      assert.equal((await purgeExpiredBriefUploads(payload, future)).deleted, 0, 'La corbeille protège encore ses pièces jointes')
    })
    await t.test('quota de stockage appliqué avant écriture', async () => {
      process.env.CMS_BRIEF_STORAGE_MAX_BYTES = '0'
      try { await assert.rejects(() => storeBriefUpload(payload, { ...input, uploadKey: randomUUID(), rateKey: randomUUID() }), error => error instanceof SubmissionError && error.status === 507) }
      finally { delete process.env.CMS_BRIEF_STORAGE_MAX_BYTES }
    })
  } finally { await payload.destroy() }
})
