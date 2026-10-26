import { createLocalReq, type CollectionAfterChangeHook, type Payload, type PayloadRequest } from 'payload'
import { fromPayloadContent, toPayloadContent } from './content-fields'
import { hasRole } from './access'
import type { PageBlock, PageRecord } from './page-types'

type EditorUser = NonNullable<PayloadRequest['user']>
type SharedSnapshot = { id: string | number; title: string; layout: PageBlock[]; updatedAt: string }
type DependencySnapshot = { format: 1; sharedSections: SharedSnapshot[] }
type ReleasedPage = PageRecord & { _dependencies?: DependencySnapshot; _locale?: 'fr' | 'en' }
type EditorInput = { pageUpdatedAt: string; contentUpdatedAt: string; layout?: PageBlock[]; content?: unknown; publish?: boolean; locale?: 'fr' | 'en' }
type RestoreExpectation = { pageUpdatedAt?: string; contentUpdatedAt?: string; dependencyUpdatedAt?: Record<string, string> }

function requireEditor(user: EditorUser) {
  if (!hasRole(user, ['owner', 'admin', 'editor'])) throw new Error('Accès interdit.')
}

function sectionIDs(layout: PageBlock[]) {
  const ids = new Set<string>()
  const visit = (blocks: PageBlock[]) => {
    if (!Array.isArray(blocks)) throw new Error('Composition de publication invalide.')
    for (const block of blocks) {
      if (block.blockType === 'shared') {
        const id = typeof block.section === 'object' && block.section ? block.section.id : block.section
        if ((typeof id !== 'number' && typeof id !== 'string') || !String(id)) throw new Error('Une section synchronisée n’a pas de référence valide.')
        ids.add(String(id))
      }
      if (block.items) visit(block.items)
    }
  }
  visit(layout)
  return [...ids]
}

export function normalizeLayout(layout: PageBlock[]): PageBlock[] {
  return layout.map(block => {
    const next = { ...block }
    if (next.media && typeof next.media === 'object') next.media = next.media.id
    if (next.section && typeof next.section === 'object') next.section = next.section.id
    if (next.items) next.items = normalizeLayout(next.items)
    return next
  })
}
/** Capture only the currently published dependency, never a newer working draft. */
async function captureDependencies(payload: Payload, layout: PageBlock[], req: PayloadRequest): Promise<DependencySnapshot> {
  const captured = new Map<string, SharedSnapshot>()
  const visiting = new Set<string>()
  const visit = async (id: string) => {
    if (visiting.has(id)) throw new Error('Cycle de sections synchronisées : publication refusée.')
    if (captured.has(id)) return
    if (captured.size + visiting.size >= 500) throw new Error('Trop de sections synchronisées dans cette publication.')
    visiting.add(id)
    const section = await payload.findByID({ collection: 'shared-sections', id, draft: false, trash: false, depth: 0, req, overrideAccess: false })
    if (section._status !== 'published' || section.deletedAt) throw new Error(`La section « ${section.title || id} » doit être publiée explicitement avant de publier cette page.`)
    const snapshot = { id: section.id, title: String(section.title), layout: normalizeLayout(section.layout || []), updatedAt: String(section.updatedAt) }
    for (const child of sectionIDs(snapshot.layout)) await visit(child)
    captured.set(id, snapshot)
    visiting.delete(id)
  }
  for (const id of sectionIDs(layout)) await visit(id)
  return { format: 1, sharedSections: [...captured.values()] }
}

/** The same transaction captures every page publication: native admin, jobs and
 * the visual editor. No request/context flag can disable the snapshot. */
export const capturePagePublication: CollectionAfterChangeHook = async ({ doc, data, req }) => {
  if ((data._status ?? doc._status) !== 'published' || doc.deletedAt || data.deletedAt) return doc
  // Reduced test/utility configurations can intentionally omit this global.
  if (!req.payload.config.globals.some(global => global.slug === 'site-content')) return doc
  const page = await req.payload.findByID({ collection: 'pages', id: doc.id, draft: false, trash: false, depth: 0, req, overrideAccess: true })
  if (page._status !== 'published' || page.deletedAt) return doc
  const layout = normalizeLayout(page.layout || [])
  const dependencies = await captureDependencies(req.payload, layout, req)
  const content = await req.payload.findGlobal({ slug: 'site-content', draft: false, depth: 0, req, overrideAccess: true })
  await req.payload.create({ collection: 'publication-releases', data: {
    title: `${page.title} — ${req.locale || 'fr'} — ${new Date().toISOString()}`, page: page.id,
    pageSnapshot: { ...page, layout, _dependencies: dependencies, _locale: req.locale === 'en' ? 'en' : 'fr' },
    contentSnapshot: content, actor: req.user?.id || null,
  }, req, overrideAccess: true })
  return doc
}

async function transaction<T>(payload: Payload, user: EditorUser, work: (req: PayloadRequest) => Promise<T>, locale: 'fr' | 'en' = 'fr') {
  requireEditor(user)
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Transactions requises.')
  const req = await createLocalReq({ user }, payload)
  req.transactionID = transactionID
  req.locale = locale
  try {
    const result = await work(req)
    await payload.db.commitTransaction(transactionID)
    return result
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}

async function workingSet(payload: Payload, id: number, req: PayloadRequest) {
  // Explicit trash:false prevents restoration and queued saves resurrecting a
  // deleted page. Restoring from the trash remains a separate owner/admin act.
  const page = await payload.findByID({ collection: 'pages', id, draft: true, trash: false, depth: 0, req, overrideAccess: false })
  if (page.deletedAt) throw new Error('Cette page est dans la corbeille. Restaurez-la explicitement avant de modifier ses contenus.')
  const content = await payload.findGlobal({ slug: 'site-content', draft: true, depth: 0, req, overrideAccess: false })
  return { page, content }
}

async function writeEditor(payload: Payload, user: EditorUser, id: number, input: EditorInput, req: PayloadRequest) {
  const { page, content } = await workingSet(payload, id, req)
  if (page.updatedAt !== input.pageUpdatedAt || content.updatedAt !== input.contentUpdatedAt) throw new Error('CONFLICT: une autre personne a enregistré une modification. Rechargez avant de poursuivre.')
  const layout = normalizeLayout(input.layout ?? page.layout)
  const status = input.publish ? 'published' : 'draft'
  const savedContent = input.content !== undefined || input.publish
    ? await payload.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(fromPayloadContent(input.content ?? content)), _status: status }, draft: !input.publish, req, overrideAccess: false })
    : content
  const savedPage = await payload.update({ collection: 'pages', id, data: { title: page.title, layout, _status: status }, draft: !input.publish, req, overrideAccess: false })
  return { page: savedPage, content: savedContent }
}

export function saveEditor(payload: Payload, user: EditorUser, id: number, input: EditorInput) {
  if (input.locale !== undefined && input.locale !== 'fr' && input.locale !== 'en') throw new Error('Langue non prise en charge.')
  return transaction(payload, user, req => writeEditor(payload, user, id, input, req), input.locale || 'fr')
}

function releasedDependencies(snapshot: ReleasedPage): SharedSnapshot[] {
  const references = sectionIDs(snapshot.layout)
  if (!snapshot._dependencies) {
    if (references.length) throw new Error('Cette ancienne publication ne conserve pas ses sections synchronisées. Une restauration complète est impossible ; restaurez leurs versions explicitement.')
    return []
  }
  if (snapshot._dependencies.format !== 1 || !Array.isArray(snapshot._dependencies.sharedSections) || snapshot._dependencies.sharedSections.length > 500) throw new Error('Instantané de dépendances invalide.')
  const sections = snapshot._dependencies.sharedSections
  const byID = new Map<string, SharedSnapshot>()
  for (const section of sections) {
    if (!section || !['number', 'string'].includes(typeof section.id) || !String(section.id) || !Array.isArray(section.layout) || typeof section.title !== 'string' || byID.has(String(section.id))) throw new Error('Instantané de section invalide.')
    byID.set(String(section.id), section)
  }
  const reachable = new Set<string>()
  const visiting = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('Cycle dans les dépendances de la publication.')
    if (reachable.has(id)) return
    const section = byID.get(id)
    if (!section) throw new Error('Une section manque dans l’instantané de cette publication.')
    visiting.add(id)
    for (const child of sectionIDs(section.layout)) visit(child)
    visiting.delete(id); reachable.add(id)
  }
  references.forEach(visit)
  if (reachable.size !== sections.length) throw new Error('L’instantané contient une section étrangère à cette page.')
  return sections
}

/** Restore the whole saved working set atomically; public dependencies stay put. */
export function restoreRelease(payload: Payload, user: EditorUser, releaseID: string | number, expected: RestoreExpectation = {}) {
  return transaction(payload, user, async req => {
    const release = await payload.findByID({ collection: 'publication-releases', id: releaseID, depth: 0, req, overrideAccess: false })
    const snapshot = release.pageSnapshot as ReleasedPage
    req.locale = snapshot._locale === 'en' ? 'en' : 'fr'
    const relatedPage = typeof release.page === 'object' && release.page ? release.page.id : release.page
    if (!snapshot || !Number.isSafeInteger(snapshot.id) || String(snapshot.id) !== String(relatedPage) || !Array.isArray(snapshot.layout)) throw new Error('Instantané de page invalide.')
    const sections = releasedDependencies(snapshot)
    const current = await workingSet(payload, snapshot.id, req)
    if ((expected.pageUpdatedAt && expected.pageUpdatedAt !== current.page.updatedAt) || (expected.contentUpdatedAt && expected.contentUpdatedAt !== current.content.updatedAt)) throw new Error('CONFLICT: la page ou les contenus partagés ont changé. Rechargez avant de restaurer.')
    const restoredSections: { id: string | number; title: string }[] = []
    for (const section of sections) {
      const existing = await payload.findByID({ collection: 'shared-sections', id: section.id, draft: true, trash: false, depth: 0, req, overrideAccess: false })
      if (existing.deletedAt) throw new Error(`La section « ${section.title} » est dans la corbeille. Restaurez-la explicitement avant cette publication.`)
      if (expected.dependencyUpdatedAt?.[String(section.id)] && expected.dependencyUpdatedAt[String(section.id)] !== existing.updatedAt) throw new Error(`CONFLICT: la section « ${section.title} » a changé. Rechargez avant de restaurer.`)
      await payload.update({ collection: 'shared-sections', id: section.id, data: { title: section.title, layout: normalizeLayout(section.layout), _status: 'draft' }, draft: true, trash: false, req, overrideAccess: false })
      restoredSections.push({ id: section.id, title: section.title })
    }
    const result = await writeEditor(payload, user, snapshot.id, { pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, layout: snapshot.layout, content: release.contentSnapshot, publish: false }, req)
    return { ...result, restoredSections }
  })
}
