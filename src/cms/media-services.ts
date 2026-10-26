import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createLocalReq, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook, type Payload, type PayloadRequest, type Where } from 'payload'
import { hasRole } from './access'
import { inspectVideo } from './media-video'
import { validateIconFile, IconFormatError } from './icon-formats'

type User = NonNullable<PayloadRequest['user']>
type RecordValue = Record<string, unknown> & { id: string | number; updatedAt?: string }
export type LibraryMedia = RecordValue & {
  filename?: string; url?: string; alt?: string; mimeType?: string; filesize?: number; width?: number; height?: number;
  visibility?: 'public' | 'restricted'; collection?: string; tags?: string[]; credit?: string; authorization?: string;
  rightsUntil?: string | null; language?: string; transcript?: string; sizes?: Record<string, { url?: string; filesize?: number }>;
}
export type MediaUsage = {
  kind: 'draft' | 'public' | 'version' | 'release' | 'dependency' | 'template'; source: string; id: string; title: string;
  fields: string[]; href: string; date?: string; replaceable: boolean;
}
type DraftTarget = { source: 'pages' | 'shared-sections' | 'site-content'; id: string | number; data: RecordValue; fields: string[] }
export class MediaError extends Error { constructor(message: string, public status = 400) { super(message) } }

export function requireMediaEditor(user: PayloadRequest['user']): asserts user is User {
  if (!user || !hasRole(user, ['owner', 'admin', 'editor'])) throw new MediaError('La médiathèque éditoriale est réservée aux éditeurs, administrateurs et propriétaires.', user ? 403 : 401)
}
export function mediaID(input: unknown): number {
  if (!(typeof input === 'number' || (typeof input === 'string' && /^\d+$/.test(input)))) throw new MediaError('Identifiant de média invalide.')
  const id = Number(input)
  if (!Number.isSafeInteger(id) || id <= 0) throw new MediaError('Identifiant de média invalide.')
  return id
}
export function mediaLimits() {
  const positive = (value: string | undefined, fallback: number) => value && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback
  return { maxFileBytes: positive(process.env.MEDIA_MAX_BYTES, 100 * 1024 * 1024), maxStorageBytes: positive(process.env.MEDIA_STORAGE_MAX_BYTES, 10 * 1024 * 1024 * 1024) }
}

/** Measured local files, including web variants and retained originals; no provider billing estimate. */
export async function storageObservation(payload: Payload) {
  const upload = payload.collections.media.config.upload
  if (!upload || !upload.staticDir || upload.disableLocalStorage) return { available: false as const, observedAt: new Date().toISOString(), reason: 'Le stockage local n’est pas disponible pour cette configuration.', ...mediaLimits() }
  const directory = path.resolve(upload.staticDir)
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { available: true as const, bytes: 0, files: 0, observedAt: new Date().toISOString(), ...mediaLimits() }
    throw error
  }
  let bytes = 0; let files = 0
  for (const item of entries) {
    if (!item.isFile()) continue // Never follow symlinks or descend into unknown storage directories.
    const info = await stat(path.join(directory, item.name))
    bytes += info.size; files++
  }
  return { available: true as const, bytes, files, observedAt: new Date().toISOString(), ...mediaLimits() }
}

export async function validateMediaFile(file: { data: Buffer; name: string; mimetype: string; size: number }, options: { maxFileBytes?: number; allowWav?: boolean } = {}) {
  const maxFileBytes = options.maxFileBytes ?? mediaLimits().maxFileBytes
  if (!Buffer.isBuffer(file.data) || !file.data.length || file.size !== file.data.length) throw new MediaError('Le fichier est vide ou incomplet.')
  if (file.size > maxFileBytes) throw new MediaError('Le fichier dépasse la limite de téléversement configurée.', 413)
  try { if (await validateIconFile(file)) return } catch (error) { if (error instanceof IconFormatError) throw new MediaError(error.message, error.status); throw error }
  const extension = path.extname(file.name).toLowerCase()
  const allowed: Record<string, string[]> = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/avif': ['.avif'], 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'audio/mpeg': ['.mp3'], 'text/vtt': ['.vtt'], 'application/pdf': ['.pdf'], ...(options.allowWav ? { 'audio/wav': ['.wav'] } : {}) }
  if (!allowed[file.mimetype]?.includes(extension)) throw new MediaError('Le type et l’extension du fichier ne correspondent pas aux formats autorisés.')
  if (file.mimetype.startsWith('video/')) {
    try { return inspectVideo(file.data, file.mimetype) } catch (error) { throw new MediaError(error instanceof Error ? error.message : 'Vidéo invalide.') }
  }
  if (file.mimetype.startsWith('image/')) {
    const expected: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'heif' }
    try {
      const info = await sharp(file.data, { limitInputPixels: 100_000_000, animated: false }).metadata()
      if (info.format !== expected[file.mimetype] || !info.width || !info.height || (file.mimetype === 'image/avif' && info.compression !== 'av1')) throw new Error('format')
    } catch { throw new MediaError('Image invalide, format falsifié ou dimensions excessives.') }
    return
  }
  const head = file.data.subarray(0, 48)
  const valid = file.mimetype === 'audio/wav' ? head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WAVE' && file.data.length >= 44 && file.data.readUInt32LE(4) + 8 === file.data.length
    : file.mimetype === 'audio/mpeg' ? head.toString('ascii', 0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
    : file.mimetype === 'application/pdf' ? head.toString('ascii', 0, 5) === '%PDF-'
    : file.mimetype === 'text/vtt' ? file.size <= 2 * 1024 * 1024 && /^(?:\uFEFF)?WEBVTT(?:[ \t]|\r?\n)/.test(file.data.toString('utf8')) && !file.data.includes(0)
    : false
  if (!valid) throw new MediaError('La signature du fichier ne correspond pas au type annoncé.')
}

/** Runs before Payload prepares, overwrites or deletes an upload's stored files. */
export const mediaBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation === 'create' && req.file) await validateMediaFile(req.file)
  if (operation !== 'update' && operation !== 'updateByID') return args
  const edits = req.query?.uploadEdits
  if (req.file || (edits && (typeof edits !== 'object' || Object.keys(edits).length))) throw new MediaError('Un original conservé ne peut être écrasé ni recadré. Importez une nouvelle version pour effectuer ces modifications.')
  const input = args as { id?: number | string; data: Record<string, unknown> }
  const keys = ['url', 'filename', 'mimeType', 'filesize', 'width', 'height', 'sizes', 'thumbnailURL', 'focalX', 'focalY', 'prefix', '_objectKey', 'sourceKey'].filter(key => key in input.data)
  if (keys.length) {
    if (!input.id) throw new MediaError('Les références physiques ne peuvent être modifiées par lot.')
    const stored = await req.payload.findByID({ collection: 'media', id: input.id, depth: 0, req, overrideAccess: false })
    for (const key of keys) {
      if (!isDeepStrictEqual(input.data[key], stored[key])) throw new MediaError(`Les références physiques et variantes d’un média sont immuables (${key}). Importez une nouvelle version.`)
      delete input.data[key] // Even unchanged focal inputs must not trigger Payload's in-place processing.
    }
  }
  return args
}

/** Last quota check after web variants are prepared and before creation writes them. */
export const mediaUploadGuard: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (!req.file) return data
  if (operation === 'update') throw new MediaError('Importez une nouvelle version : le remplacement physique des originaux est interdit.')
  // Payload 3.92 clears size after preparing an unchanged in-memory upload.
  // Use the actual received buffer length, never a client-supplied metadata value.
  if (req.file.size == null && Buffer.isBuffer(req.file.data)) req.file.size = req.file.data.length
  const video = await validateMediaFile(req.file)
  if (video) { data.width = video.width; data.height = video.height }
  const storage = await storageObservation(req.payload)
  const sizes = data.sizes && typeof data.sizes === 'object' ? Object.values(data.sizes as Record<string, { filesize?: number }>) : []
  const projectedBytes = req.file.size + sizes.reduce((sum, item) => sum + (Number(item?.filesize) || 0), 0)
  if (storage.available && storage.bytes + projectedBytes > storage.maxStorageBytes) throw new MediaError('Le quota de stockage local est atteint. Les anciens fichiers sont conservés pour les historiques.', 413)
  return data
}

const mediaRelationKeys = new Set(['media', 'image', 'poster', 'captions', 'favicon', 'appleIcon', 'logoImage'])
function urlMap(from: LibraryMedia, to?: LibraryMedia, base = 'https://mis-prod.fr') {
  const urls = new Map<string, string>()
  const add = (source: string | undefined, target: string | undefined) => {
    if (!source) return
    urls.set(source, target || source)
    if (source.startsWith('/')) urls.set(new URL(source, base).href, target?.startsWith('/') ? new URL(target, base).href : target || source)
    else {
      try {
        const original = new URL(source)
        if (original.origin === new URL(base).origin) {
          const next = target ? new URL(target, base) : original
          urls.set(original.pathname + original.search, next.origin === original.origin ? next.pathname + next.search : next.href)
        }
      } catch { /* A non-URL value only matches its exact stored representation. */ }
    }
  }
  add(from.url, to?.url)
  for (const [key, size] of Object.entries(from.sizes || {})) add(size.url, to?.sizes?.[key]?.url || to?.url)
  return urls
}

/** Exact URLs and typed media relationships only; unrelated numbers/text remain unchanged. */
export function mediaReferences(value: unknown, media: LibraryMedia, replacement?: LibraryMedia, base?: string) {
  const urls = urlMap(media, replacement, base)
  const paths: string[] = []
  const visit = (current: unknown, fieldPath: string, key: string): unknown => {
    if (typeof current === 'string' && urls.has(current)) { paths.push(fieldPath); return replacement ? urls.get(current) : current }
    if (mediaRelationKeys.has(key) && current != null) {
      const relation = typeof current === 'object' && 'id' in current ? current.id : current
      if ((typeof relation === 'number' || typeof relation === 'string') && String(relation) === String(media.id)) { paths.push(fieldPath); return replacement ? replacement.id : current }
    }
    if (Array.isArray(current)) return current.map((item, index) => visit(item, `${fieldPath}.${index}`, key))
    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>
      if (record.relationTo === 'media' && String(typeof record.value === 'object' && record.value ? (record.value as Record<string, unknown>).id : record.value) === String(media.id)) {
        paths.push(`${fieldPath}.value`); return replacement ? { ...record, value: replacement.id } : current
      }
      return Object.fromEntries(Object.entries(record).map(([name, item]) => [name, visit(item, fieldPath ? `${fieldPath}.${name}` : name, name)]))
    }
    return current
  }
  return { paths, value: visit(value, '', '') }
}

async function readAll(fetchPage: (page: number) => Promise<{ docs: unknown[]; hasNextPage?: boolean }>) {
  const documents: RecordValue[] = []
  for (let page = 1; ; page++) {
    const result = await fetchPage(page)
    documents.push(...result.docs as RecordValue[])
    if (documents.length > 50_000) throw new MediaError('L’inventaire dépasse 50 000 documents : traitement par lot requis avant remplacement.', 413)
    if (!result.hasNextPage) return documents
  }
}

async function draftTargets(payload: Payload, user: User, media: LibraryMedia, req?: PayloadRequest) {
  const options = { depth: 0, overrideAccess: false, user, req, locale: 'all' as const }
  const targets: DraftTarget[] = []
  for (const source of ['pages', 'shared-sections'] as const) {
    const docs = await readAll(page => payload.find({ collection: source, ...options, draft: true, page, limit: 200, sort: 'id' }))
    for (const doc of docs) {
      const fields = mediaReferences(doc, media, undefined, payload.config.serverURL).paths
      if (fields.length) targets.push({ source, id: doc.id, data: doc, fields })
    }
  }
  const content = await payload.findGlobal({ slug: 'site-content', ...options, draft: true }) as RecordValue
  const fields = mediaReferences(content, media, undefined, payload.config.serverURL).paths
  if (fields.length) targets.push({ source: 'site-content', id: 'site-content', data: content, fields })
  return targets
}
function fingerprint(media: LibraryMedia, targets: DraftTarget[]) {
  return createHash('sha256').update(JSON.stringify({ media: { id: media.id, updatedAt: media.updatedAt, url: media.url, sizes: media.sizes }, targets })).digest('hex')
}
function linkFor(source: string, id: string | number) {
  return source === 'site-content' ? '/admin/globals/site-content' : source === 'pages' ? `/atelier/${id}` : `/admin/collections/${source}/${id}`
}

export async function getMediaUsage(payload: Payload, user: PayloadRequest['user'], id: number) {
  requireMediaEditor(user)
  const media = await payload.findByID({ collection: 'media', id: mediaID(id), depth: 0, user, overrideAccess: false }) as LibraryMedia
  const targets = await draftTargets(payload, user, media)
  const usages: MediaUsage[] = targets.map(target => ({ kind: 'draft', source: target.source, id: String(target.id), title: String(target.data.title && typeof target.data.title === 'object' ? (target.data.title as Record<string, unknown>).fr : target.data.title || 'Identité et contenus partagés'), fields: target.fields, href: linkFor(target.source, target.id), date: target.data.updatedAt, replaceable: true }))
  const options = { depth: 0, overrideAccess: false, user, locale: 'all' as const }
  const add = (kind: MediaUsage['kind'], source: string, record: RecordValue, data: unknown, parent?: unknown) => {
    const fields = mediaReferences(data, media, undefined, payload.config.serverURL).paths
    if (fields.length) usages.push({ kind, source, id: String(record.id), title: String(record.title && typeof record.title === 'object' ? (record.title as Record<string, unknown>).fr : record.title || `${source} · ${parent || record.id}`), fields, href: linkFor(source, typeof parent === 'number' || typeof parent === 'string' ? parent : record.id), date: record.updatedAt, replaceable: false })
  }
  for (const source of ['pages', 'shared-sections'] as const) {
    for (const doc of await readAll(page => payload.find({ collection: source, ...options, draft: false, where: { _status: { equals: 'published' } }, page, limit: 200 }))) add('public', source, doc, doc)
    for (const doc of await readAll(page => payload.findVersions({ collection: source, ...options, page, limit: 200 }))) add('version', source, doc, doc.version, doc.parent)
  }
  const content = await payload.findGlobal({ slug: 'site-content', ...options, draft: false }) as RecordValue
  add('public', 'site-content', content, content)
  for (const doc of await readAll(page => payload.findGlobalVersions({ slug: 'site-content', ...options, page, limit: 200 }))) add('version', 'site-content', doc, doc.version)
  for (const doc of await readAll(page => payload.find({ collection: 'publication-releases', ...options, page, limit: 200 }))) add('release', 'publication-releases', doc, { pageSnapshot: doc.pageSnapshot, contentSnapshot: doc.contentSnapshot })
  for (const doc of await readAll(page => payload.find({ collection: 'section-templates', ...options, page, limit: 200 }))) add('template', 'section-templates', doc, doc)
  for (const doc of await readAll(page => payload.find({ collection: 'media', ...options, where: { id: { not_equals: media.id } }, page, limit: 200 }))) add('dependency', 'media', doc, { poster: doc.poster, captions: doc.captions })
  if (typeof media.sourceKey === 'string' && media.sourceKey.startsWith('resumable:') && media.sourceKey.endsWith(':original')) {
    const derived = await payload.find({ collection: 'media', ...options, where: { sourceKey: { equals: media.sourceKey.slice(0, -':original'.length) } }, limit: 1 })
    for (const doc of derived.docs) usages.push({ kind: 'dependency', source: 'media', id: String(doc.id), title: `Source conservée du recadrage ${doc.filename || doc.id}`, fields: ['sourceKey'], href: linkFor('media', doc.id), date: doc.updatedAt, replaceable: false })
  }
  return { media, usages, fingerprint: fingerprint(media, targets), checkedAt: new Date().toISOString(), scope: 'Pages, sections synchronisées, contenus globaux, versions, publications figées, modèles et dépendances de médias. Les fichiers client privés restent dans l’espace client.' }
}

/** Atomic draft-only substitution. Published snapshots and all old files stay intact. */
export async function replaceMediaReferences(payload: Payload, user: PayloadRequest['user'], input: { fromID: unknown; toID: unknown; fingerprint: unknown }) {
  requireMediaEditor(user)
  const fromID = mediaID(input.fromID); const toID = mediaID(input.toID)
  if (fromID === toID) throw new MediaError('Choisissez un autre média pour le remplacement.')
  if (typeof input.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(input.fingerprint)) throw new MediaError('Relancez l’inventaire des usages avant de remplacer.')
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new MediaError('Le remplacement exige une base compatible avec les transactions.', 503)
  const req = await createLocalReq({ user }, payload); req.transactionID = transactionID
  try {
    const from = await payload.findByID({ collection: 'media', id: fromID, depth: 0, req, overrideAccess: false }) as LibraryMedia
    const to = await payload.findByID({ collection: 'media', id: toID, depth: 0, req, overrideAccess: false }) as LibraryMedia
    if (from.mimeType?.split('/')[0] !== to.mimeType?.split('/')[0]) throw new MediaError('Conservez le même type de média (image, vidéo, son ou document) pour préserver les composants.')
    if (!to.url || (to.rightsUntil && Date.parse(to.rightsUntil) <= Date.now())) throw new MediaError('Le média de remplacement est absent ou ses droits sont expirés.')
    const targets = await draftTargets(payload, user, from, req)
    if (fingerprint(from, targets) !== input.fingerprint) throw new MediaError('Les brouillons ou les usages ont changé. Actualisez l’inventaire avant de remplacer.', 409)
    const updated: { source: string; id: string | number; references: number }[] = []
    for (const target of targets) {
      const data = mediaReferences(target.data, from, to, payload.config.serverURL).value as Record<string, unknown>
      if (target.source === 'site-content') {
        // Localized arrays validate one locale at a time in Payload. Read every
        // locale, then write only changed groups inside this same transaction.
        const schema = payload.config.globals.find(global => global.slug === 'site-content')!
        const localized = new Set(schema.fields.filter(field => 'name' in field && 'localized' in field && field.localized).map(field => 'name' in field ? field.name : ''))
        const locales = payload.config.localization ? payload.config.localization.locales.map(locale => locale.code) : ['fr']
        const changedGroups = [...new Set(target.fields.map(field => field.split('.')[0]))]
        for (const [index, locale] of locales.entries()) {
          const patch: Record<string, unknown> = {}
          for (const key of changedGroups) {
            const oldValue = localized.has(key) ? (target.data[key] as Record<string, unknown>)?.[locale] : target.data[key]
            if ((!localized.has(key) && index > 0) || !mediaReferences(oldValue, from, undefined, payload.config.serverURL).paths.length) continue
            patch[key] = localized.has(key) ? (data[key] as Record<string, unknown>)?.[locale] : data[key]
          }
          if (Object.keys(patch).length) await payload.updateGlobal({ slug: 'site-content', data: { ...patch, _status: 'draft' }, draft: true, locale, req, overrideAccess: false })
        }
      } else {
        await payload.update({ collection: target.source, id: target.id, data: { layout: data.layout, ...(target.source === 'pages' ? { seo: data.seo } : {}), _status: 'draft' }, draft: true, locale: 'all', req, overrideAccess: false })
      }
      updated.push({ source: target.source, id: target.id, references: target.fields.length })
    }
    await payload.create({ collection: 'audit-log', data: { action: 'media-replace-drafts', collectionName: 'media', documentID: `${fromID}→${toID}`, actor: user.id, occurredAt: new Date().toISOString() }, req, overrideAccess: true })
    await payload.db.commitTransaction(transactionID)
    return { updated, fromID, toID, published: false, retainedOriginal: true }
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}

export async function listMedia(payload: Payload, user: PayloadRequest['user'], input: { query?: string; collection?: string; tag?: string; type?: string; page?: number }) {
  requireMediaEditor(user)
  const conditions: Where[] = []
  if (input.query?.trim()) conditions.push({ or: [{ alt: { like: input.query.trim().slice(0, 200) } }, { filename: { like: input.query.trim().slice(0, 200) } }] })
  if (input.collection) conditions.push({ collection: { equals: input.collection.slice(0, 120) } })
  if (input.tag) conditions.push({ tags: { contains: input.tag.slice(0, 80) } })
  if (input.type && ['image', 'video', 'audio', 'application', 'text'].includes(input.type)) conditions.push({ mimeType: { like: `${input.type}/` } })
  const page = Math.min(100_000, Math.max(1, Math.floor(Number(input.page) || 1)))
  const result = await payload.find({ collection: 'media', user, overrideAccess: false, depth: 0, limit: 36, page, sort: '-createdAt', ...(conditions.length ? { where: { and: conditions } } : {}) })
  return { ...result, docs: result.docs as LibraryMedia[], storage: await storageObservation(payload) }
}

/** A date selected in the French UI expires at the end of that day in Paris, including DST. */
export function mediaRightsDeadline(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new MediaError('Échéance des droits invalide.')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const midday = new Date(Date.UTC(year, month - 1, day, 12))
    if (midday.toISOString().slice(0, 10) !== value) throw new MediaError('Échéance des droits invalide.')
    const offset = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }).formatToParts(midday).find(part => part.type === 'timeZoneName')?.value.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
    if (!offset) throw new MediaError('Fuseau horaire Europe/Paris indisponible.')
    const offsetMinutes = (Number(offset[2]) * 60 + Number(offset[3] || 0)) * (offset[1] === '+' ? 1 : -1)
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMinutes * 60_000).toISOString()
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new MediaError('Échéance des droits invalide.')
  return new Date(value).toISOString()
}

export async function updateMediaMetadata(payload: Payload, user: PayloadRequest['user'], input: { ids: unknown; patch: unknown; revisions: unknown }) {
  requireMediaEditor(user)
  if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 100) throw new MediaError('Sélectionnez entre 1 et 100 médias.')
  const ids = [...new Set(input.ids.map(mediaID))]
  if (!input.revisions || typeof input.revisions !== 'object' || ids.some(id => typeof (input.revisions as Record<string, unknown>)[String(id)] !== 'string')) throw new MediaError('Actualisez les médias avant de les modifier.')
  if (!input.patch || typeof input.patch !== 'object' || Array.isArray(input.patch)) throw new MediaError('Modifications invalides.')
  const values = input.patch as Record<string, unknown>; const patch: Record<string, unknown> = {}
  const bounds: Record<string, number> = { alt: 2000, collection: 120, credit: 400, authorization: 4000, transcript: 200_000 }
  for (const [key, max] of Object.entries(bounds)) if (key in values) {
    if (typeof values[key] !== 'string' || values[key].length > max || (key === 'alt' && !values[key].trim())) throw new MediaError(`Le champ ${key} est vide ou trop long.`)
    patch[key] = values[key]
  }
  if ('visibility' in values) { if (!['public', 'restricted'].includes(String(values.visibility))) throw new MediaError('Diffusion invalide.'); patch.visibility = values.visibility }
  if ('language' in values) { if (!['fr', 'en'].includes(String(values.language))) throw new MediaError('Langue invalide.'); patch.language = values.language }
  if ('rightsUntil' in values) patch.rightsUntil = mediaRightsDeadline(values.rightsUntil)
  if ('tags' in values) { if (!Array.isArray(values.tags) || values.tags.length > 30 || values.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 80)) throw new MediaError('Étiquettes invalides (30 maximum, 80 caractères chacune).'); patch.tags = [...new Set(values.tags)] }
  if (!Object.keys(patch).length) throw new MediaError('Aucune modification autorisée.')
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new MediaError('Transaction indisponible.', 503)
  const req = await createLocalReq({ user }, payload); req.transactionID = transactionID
  try {
    for (const id of ids) {
      const current = await payload.findByID({ collection: 'media', id, depth: 0, req, overrideAccess: false })
      if (current.updatedAt !== (input.revisions as Record<string, unknown>)[String(id)]) throw new MediaError('Un média a été modifié par une autre personne. Rechargez avant de poursuivre.', 409)
      await payload.update({ collection: 'media', id, data: patch, req, overrideAccess: false })
    }
    await payload.db.commitTransaction(transactionID)
    return { updated: ids.length }
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}
