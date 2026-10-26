import type { ReactNode } from 'react'
import { getCMS } from '@/cms/payload'
import { BrowserAnalytics } from './analytics'

/** Only public technical references cross the server/client boundary. */
export async function PublicAnalytics({ children }: { children: ReactNode }) {
  if (process.env.CMS_BROWSER_ANALYTICS !== 'enabled') return children
  let paths: Record<string, string>, references: Record<string, string>
  try {
    const cms = await getCMS()
    const [pages, content] = await Promise.all([
      cms.find({ collection: 'pages', where: { _status: { equals: 'published' } }, pagination: false, depth: 0, draft: false, select: { path: true }, overrideAccess: false }),
      cms.findGlobal({ slug: 'site-content', draft: false, locale: 'fr', depth: 0, select: { projects: true, universes: true }, overrideAccess: true }),
    ])
    paths = Object.fromEntries(pages.docs.map(page => [page.path, `page-${page.id}`]))
    references = {}
    for (const project of content.projects || []) if (project.id) references[`project:${project.slug}`] = `project-${project.id}`
    for (const universe of content.universes || []) for (const item of universe.portfolio || []) if (item.id) references[`universe:${universe.slug}:${item.seed}`] = `universe-item-${item.id}`
  } catch {
    // Optional measurement must never make the public site unavailable.
    return children
  }
  return <BrowserAnalytics pages={paths} references={references}>{children}</BrowserAnalytics>
}
