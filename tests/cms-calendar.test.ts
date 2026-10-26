import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { buildConfig, getPayload } from 'payload'
import { sqliteAdapter, sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-sqlite'
import { operationCollections } from '../src/cms/operation-collections'
import { enqueueDueReminders, scheduledPublications } from '../src/cms/calendar'
import { getOperationsSnapshot, processNotificationOutbox } from '../src/cms/operations'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import * as initial from '../src/migrations/20261025_184339_initial_cms'
import * as calendar from '../src/migrations/20261025_192000_calendar_reminders'
import * as identity from '../src/migrations/20261025_192200_reminder_identity'

const migration = (name: string, source: { up: (args: MigrateUpArgs) => Promise<void>; down: (args: MigrateDownArgs) => Promise<void> }) => ({ name, up: (args: unknown) => source.up(args as MigrateUpArgs), down: (args: unknown) => source.down(args as MigrateDownArgs) })

async function database(push: boolean) {
  const key = randomUUID(), root = path.resolve('.data/tests/calendar-' + key)
  await mkdir(root, { recursive: true })
  return getPayload({ key, config: buildConfig({
    secret: randomBytes(32).toString('hex'), telemetry: false, admin: { disable: true }, typescript: { autoGenerate: false }, graphQL: { disable: true },
    onInit: async payload => installTransactionQueue(payload), jobs: { deleteJobOnComplete: false, tasks: [] },
    db: sqliteAdapter({ client: { url: 'file:' + path.join(root, 'calendar.db').replaceAll('\\', '/') }, push, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
    collections: [
      { slug: 'users', auth: true, fields: [{ name: 'role', type: 'select', options: ['owner', 'admin', 'sales', 'client', 'editor'] }, { name: 'name', type: 'text' }] },
      { slug: 'pages', versions: { drafts: { schedulePublish: true } }, fields: [{ name: 'title', type: 'text' }] },
      ...operationCollections,
    ],
  }) })
}

test('Migration calendrier : notifications existantes et verrous conservés dans une vraie transaction SQLite', async () => {
  const payload = await database(false)
  try {
    await payload.db.migrate({ migrations: [migration('initial', initial)] })
    const db = payload.db.drizzle
    await db.run(sql`INSERT INTO crm_statuses(id,title,key) VALUES (1,'Nouveau','new')`)
    await db.run(sql`INSERT INTO briefs(id,submission_key,submission_hash,status_id,answers,schema_snapshot) VALUES (1,'old-key','old-hash',1,'{}','{}')`)
    await db.run(sql`INSERT INTO notifications(id,dedupe_key,brief_id,kind,subject,recipients,body,state,attempts,first_attempt_at,provider_id) VALUES (42,'old-mail',1,'internal','Ancienne notification','["test@example.invalid"]','Corps intact','sent',2,'2026-10-24T10:00:00.000Z','provider-existing')`)
    await db.run(sql`INSERT INTO payload_locked_documents(id) VALUES (7)`)
    await db.run(sql`INSERT INTO payload_locked_documents_rels(id,parent_id,path,notifications_id) VALUES (11,7,'document',42)`)
    const before = await db.all<Record<string, unknown>>(sql`SELECT * FROM notifications WHERE id=42`)
    const lock = await db.all(sql`SELECT * FROM payload_locked_documents_rels WHERE id=11`)
    await payload.db.migrate({ migrations: [migration('initial', initial), migration('calendar', calendar), migration('identity', identity)] })
    const after = await db.all(sql`SELECT * FROM notifications WHERE id=42`)
    assert.deepEqual(after, before.map(row => ({ ...row, task_id: null })))
    assert.deepEqual(await db.all(sql`SELECT * FROM payload_locked_documents_rels WHERE id=11`), lock)
    assert.deepEqual(await db.all(sql`PRAGMA foreign_key_check`), [])
    await db.run(sql`INSERT INTO notifications(dedupe_key,kind,subject,recipients,body) VALUES ('task-only','reminder','Rappel','[]','Test')`)
    assert.equal((await db.all<{ n: number }>(sql`SELECT count(*) AS n FROM notifications WHERE brief_id IS NULL`))[0].n, 1)
    await assert.rejects(db.run(sql`INSERT INTO notifications(dedupe_key,kind,subject,recipients,body) VALUES ('old-mail','reminder','Doublon','[]','Test')`))
  } finally { await payload.destroy() }
})

test('Calendrier : publications réelles et rappels attribués, dédupliqués et annulables', async t => {
  const payload = await database(true)
  try {
    const person = await payload.create({ collection: 'users', data: { email: 'calendar@example.invalid', password: randomBytes(32).toString('hex'), role: 'owner', name: 'Recette calendrier' } })
    const user = { ...person, collection: 'users' as const }
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const create = (title: string) => payload.create({ collection: 'tasks', overrideAccess: false, user, data: { title, assignee: person.id, dueAt: yesterday, notifyAssignee: true, notifyMinutesBefore: 60 } })
    const notifications = (task: string | number) => payload.find({ collection: 'notifications', where: { task: { equals: task } }, depth: 0, overrideAccess: true })

    await t.test('deux passages concurrents et redémarrage logique ne doublonnent pas un rappel', async () => {
      const task = await create('Rappel unique')
      const result = await Promise.all([enqueueDueReminders(payload), enqueueDueReminders(payload)])
      assert.equal(result.reduce((sum, value) => sum + value.queued, 0), 1)
      assert.equal((await notifications(task.id)).totalDocs, 1)
      let sends = 0
      const transport = { send: async () => { sends++; return { providerId: 'captured-calendar', captured: true } } }
      assert.equal((await processNotificationOutbox(payload, transport)).processed, 1)
      await enqueueDueReminders(payload)
      await processNotificationOutbox(payload, transport)
      assert.equal(sends, 1)
      assert.equal((await notifications(task.id)).docs[0].state, 'captured')
    })
    await t.test('terminer une tâche retire l’urgence et annule son rappel avant envoi', async () => {
      const task = await create('À terminer')
      await enqueueDueReminders(payload)
      const before = await getOperationsSnapshot(payload, user, new URLSearchParams())
      await payload.update({ collection: 'tasks', id: task.id, data: { state: 'done' }, user, overrideAccess: false })
      const after = await getOperationsSnapshot(payload, user, new URLSearchParams())
      assert.equal(after.stats.overdue, before.stats.overdue - 1)
      assert.equal((await notifications(task.id)).docs[0].state, 'cancelled')
      assert.equal((await enqueueDueReminders(payload)).queued, 0)
      assert.equal((await processNotificationOutbox(payload, { send: async () => { throw new Error('Un rappel terminé ne doit pas partir') } })).processed, 0)
    })
    await t.test('supprimer une tâche conserve une trace annulée sans envoi', async () => {
      const task = await create('À supprimer')
      await enqueueDueReminders(payload)
      const mail = (await notifications(task.id)).docs[0]
      await payload.delete({ collection: 'tasks', id: task.id, user, overrideAccess: false })
      const cancelled = await payload.findByID({ collection: 'notifications', id: mail.id, depth: 0 })
      assert.equal(cancelled.state, 'cancelled')
      assert.equal(cancelled.task, null)
    })
    await t.test('échec, reprise explicite et capture ; reprogrammation invalide l’ancienne notification', async () => {
      const task = await create('Échec simulé')
      await enqueueDueReminders(payload)
      const mail = (await notifications(task.id)).docs[0]
      await payload.update({ collection: 'notifications', id: mail.id, data: { attempts: 2 }, overrideAccess: true })
      assert.equal((await processNotificationOutbox(payload, { send: async () => { throw new Error('Panne imposée, aucun appel réel') } })).failed, 1)
      assert.equal((await notifications(task.id)).docs[0].state, 'failed')
      await payload.update({ collection: 'notifications', id: mail.id, data: { retryNow: true }, user, overrideAccess: false })
      assert.equal((await processNotificationOutbox(payload, { send: async () => ({ providerId: 'capture-after-retry', captured: true }) })).processed, 1)
      const moved = await create('Échéance modifiée')
      await enqueueDueReminders(payload)
      await payload.update({ collection: 'tasks', id: moved.id, data: { dueAt: new Date(Date.now() + 86400000).toISOString() }, user, overrideAccess: false })
      assert.equal((await notifications(moved.id)).docs[0].state, 'cancelled')
      assert.equal((await enqueueDueReminders(payload)).queued, 0)
    })
    await t.test('attribution et lecture refusées aux rôles non commerciaux', async () => {
      const client = await payload.create({ collection: 'users', data: { email: 'calendar-client@example.invalid', password: randomBytes(32).toString('hex'), role: 'client' } })
      await assert.rejects(payload.create({ collection: 'tasks', data: { title: 'Interdit', dueAt: yesterday, assignee: client.id }, user, overrideAccess: false }), /responsable/)
      await assert.rejects(payload.find({ collection: 'tasks', user: { ...client, collection: 'users' }, overrideAccess: false }))
    })
    await t.test('réactiver un rappel crée une nouvelle programmation ; modifier le titre conserve sa déduplication', async () => {
      const task = await create('Rappel réactivable')
      await enqueueDueReminders(payload)
      await payload.update({ collection: 'tasks', id: task.id, data: { title: 'Titre corrigé' }, user, overrideAccess: false })
      assert.equal((await enqueueDueReminders(payload)).queued, 0)
      await payload.update({ collection: 'tasks', id: task.id, data: { notifyAssignee: false }, user, overrideAccess: false })
      await payload.update({ collection: 'tasks', id: task.id, data: { notifyAssignee: true }, user, overrideAccess: false })
      assert.equal((await enqueueDueReminders(payload)).queued, 1)
      assert.equal((await notifications(task.id)).totalDocs, 2)
      assert.deepEqual((await notifications(task.id)).docs.map(mail => mail.state).sort(), ['cancelled', 'pending'])
      await payload.delete({ collection: 'tasks', id: task.id, user, overrideAccess: false })
    })
    await t.test('la file Payload programme, publie puis affiche l’état terminé ; échec visible', async () => {
      const page = await payload.create({ collection: 'pages', draft: true, data: { title: 'Publication de recette', _status: 'draft' } })
      const job = await payload.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: String(page.id) }, user: { relationTo: 'users', value: String(person.id) } }, waitUntil: new Date(yesterday) })
      const from = new Date(Date.now() - 7 * 86400000).toISOString(), to = new Date(Date.now() + 7 * 86400000).toISOString()
      assert.equal((await scheduledPublications(payload, user, from, to)).items.find(item => item.id === String(job.id))?.state, 'scheduled')
      await payload.jobs.run({ limit: 20 })
      assert.equal((await payload.findByID({ collection: 'pages', id: page.id, draft: false }))._status, 'published')
      assert.equal((await scheduledPublications(payload, user, from, to)).items.find(item => item.id === String(job.id))?.state, 'completed')
      const failed = await payload.jobs.queue({ task: 'schedulePublish', input: { type: 'publish', doc: { relationTo: 'pages', value: String(page.id) } }, waitUntil: new Date(yesterday) })
      await payload.update({ collection: 'payload-jobs', id: failed.id, data: { hasError: true } })
      assert.equal((await scheduledPublications(payload, user, from, to)).items.find(item => item.id === String(failed.id))?.state, 'failed')
      assert.equal((await scheduledPublications(payload, { ...user, role: 'sales' }, from, to)).available, false)
    })
  } finally { await payload.destroy() }
})
