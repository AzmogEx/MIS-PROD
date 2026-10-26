import type { Payload } from 'payload'
import { isAnalyticsKey } from './analytics-events'

export async function analyticsContentExists(payload: Payload, key: string): Promise<boolean> {
  if (!isAnalyticsKey(key)) return false
  const document = /^(page|form)-(\d+)$/.exec(key)
  if (document) {
    const result = await payload.find({ collection: document[1] === 'page' ? 'pages' : 'forms', where: { and: [{ id: { equals: Number(document[2]) } }, { _status: { equals: 'published' } }] }, draft: false, limit: 1, depth: 0, overrideAccess: true })
    return result.totalDocs > 0
  }
  const content = await payload.findGlobal({ slug: 'site-content', draft: false, locale: 'fr', depth: 0, select: { projects: true, universes: true }, overrideAccess: true })
  if (key.startsWith('project-')) return Array.isArray(content.projects) && content.projects.some((project: { id?: string }) => `project-${project.id}` === key)
  return Array.isArray(content.universes) && content.universes.some((universe: { portfolio?: { id?: string }[] }) => universe.portfolio?.some(item => `universe-item-${item.id}` === key))
}
