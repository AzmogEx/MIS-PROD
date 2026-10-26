import { createHash } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { hasRole } from './access'

type Task = { id: string | number; reminderIdentity?: string; createdAt?: string; title?: string; description?: string; dueAt?: string; assignee?: string | number | { id: string | number }; state?: string; notifyAssignee?: boolean; notifyMinutesBefore?: number; contentPath?: string; brief?: unknown }
const id = (value: unknown) => value && typeof value === 'object' && 'id' in value ? String(value.id) : value == null ? '' : String(value)
const reminderKey = (task: Task, email: string) => `reminder:${task.id}:${createHash('sha256').update(JSON.stringify([task.reminderIdentity || task.createdAt, task.dueAt, id(task.assignee), task.notifyMinutesBefore || 0, email])).digest('hex')}`

async function currentReminder(payload: Payload, taskID: string | number) {
  const result = await payload.find({ collection: 'tasks', where: { id: { equals: taskID } }, limit: 1, depth: 0, overrideAccess: true })
  const task = result.docs[0] as Task | undefined
  if (!task || task.state !== 'open' || !task.notifyAssignee || !task.dueAt || !id(task.assignee)) return null
  const people = await payload.find({ collection: 'users', where: { id: { equals: id(task.assignee) } }, limit: 1, depth: 0, select: { email: true, role: true }, overrideAccess: true })
  const person = people.docs[0]
  if (!person || !['owner', 'admin', 'sales'].includes(String(person.role)) || typeof person.email !== 'string' || !/^\S+@\S+\.\S+$/.test(person.email)) return null
  if (task.brief) {
    const source = await payload.find({ collection: 'briefs', where: { id: { equals: id(task.brief) } }, limit: 1, depth: 0, overrideAccess: true })
    if (!source.totalDocs) return null
  }
  return { task, email: person.email, dedupeKey: reminderKey(task, person.email) }
}

export async function reminderStillValid(payload: Payload, taskID: unknown, dedupeKey: string) {
  if (!id(taskID)) return false
  const reminder = await currentReminder(payload, id(taskID))
  return reminder?.dedupeKey === dedupeKey
}

export async function enqueueDueReminders(payload: Payload, now = new Date()) {
  let queued = 0, scanned = 0, page = 1
  while (true) {
    const tasks = await payload.find({ collection: 'tasks', where: { and: [{ state: { equals: 'open' } }, { notifyAssignee: { equals: true } }, { notifyAt: { less_than_equal: now.toISOString() } }] }, limit: 100, page, sort: ['notifyAt', 'id'], depth: 0, overrideAccess: true })
    for (const task of tasks.docs) {
      scanned += 1
      const reminder = await currentReminder(payload, task.id)
      if (!reminder) continue
      const existing = await payload.find({ collection: 'notifications', where: { dedupeKey: { equals: reminder.dedupeKey } }, limit: 1, depth: 0, overrideAccess: true })
      if (existing.totalDocs) continue
      try {
        await payload.create({ collection: 'notifications', overrideAccess: true, data: {
          kind: 'reminder', task: task.id, dedupeKey: reminder.dedupeKey, subject: `[MIS] Rappel : ${String(task.title).slice(0, 120)}`,
          recipients: [reminder.email], body: `${task.title}\nÉchéance : ${new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }).format(new Date(task.dueAt))}\n${task.description || ''}\nRetrouvez cette tâche dans le calendrier MIS (fiche ${task.id}).`,
          state: 'pending', attempts: 0, nextAttemptAt: now.toISOString(),
        } })
        queued += 1
      } catch (error) {
        const duplicate = await payload.find({ collection: 'notifications', where: { dedupeKey: { equals: reminder.dedupeKey } }, limit: 1, depth: 0, overrideAccess: true })
        if (!duplicate.totalDocs) throw error
      }
      if (queued >= 100) return { queued, scanned, hasMore: true }
    }
    if (!tasks.hasNextPage) return { queued, scanned, hasMore: false }
    page += 1
  }
}

export type ScheduledPublication = { id: string; title: string; dueAt: string; action: string; state: 'scheduled' | 'processing' | 'failed' | 'completed' | 'unavailable'; contentHref?: string; jobHref: string }
export async function scheduledPublications(payload: Payload, user: PayloadRequest['user'], monthStart: string, monthEnd: string) {
  if (!hasRole(user, ['owner', 'admin', 'editor'])) return { available: false, items: [] as ScheduledPublication[], total: 0 }
  if (!payload.collections['payload-jobs']) return { available: false, items: [] as ScheduledPublication[], total: 0 }
  const jobs = await payload.find({ collection: 'payload-jobs', where: { and: [{ taskSlug: { equals: 'schedulePublish' } }, { waitUntil: { less_than: monthEnd } }, { or: [{ completedAt: { exists: false } }, { waitUntil: { greater_than_equal: monthStart } }] }] }, sort: 'waitUntil', limit: 250, depth: 0, overrideAccess: true })
  const items: ScheduledPublication[] = []
  for (const job of jobs.docs) {
    const input = job.input as { type?: string; doc?: { relationTo?: string; value?: string }; global?: string }
    const item: ScheduledPublication = { id: String(job.id), title: 'Contenu non disponible', dueAt: String(job.waitUntil || job.createdAt), action: input?.type === 'unpublish' ? 'Retrait de publication' : 'Publication', state: job.completedAt ? 'completed' : job.hasError ? 'failed' : job.processing ? 'processing' : 'scheduled', jobHref: `/admin/collections/payload-jobs/${job.id}` }
    try {
      if (input?.doc && ['pages', 'forms', 'shared-sections'].includes(input.doc.relationTo || '') && input.doc.value) {
        const doc = await payload.findByID({ collection: input.doc.relationTo!, id: input.doc.value, draft: true, depth: 0, user: user!, overrideAccess: false })
        item.title = String(doc.title || 'Contenu éditorial'); item.contentHref = `/admin/collections/${input.doc.relationTo}/${doc.id}`
      } else if (input?.global === 'site-content') {
        await payload.findGlobal({ slug: 'site-content', user: user!, overrideAccess: false, depth: 0, select: { updatedAt: true } })
        item.title = 'Identité, contenus et navigation'; item.contentHref = '/admin/globals/site-content'
      } else item.state = 'unavailable'
    } catch { item.state = 'unavailable' }
    items.push(item)
  }
  return { available: true, items, total: jobs.totalDocs }
}
