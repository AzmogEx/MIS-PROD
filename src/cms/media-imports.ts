import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rmdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { hasRole } from './access'
import { MediaError, mediaLimits, requireMediaEditor, storageObservation, validateMediaFile, type LibraryMedia } from './media-services'
import { cropImportImage, normalizeImageEdits, type ImageImportEdits } from './media-image-edits'

export const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024
type User = NonNullable<PayloadRequest['user']>
type Receipt = { size: number; sha256: string }
type Manifest = {
  version: 1; id: string; ownerID: string; tokenHash: string; name: string; type: string; size: number; fingerprint: string;
  collection: string; createdAt: string; updatedAt: string; expiresAt: string; status: 'receiving' | 'processing' | 'complete' | 'failed' | 'cancelled';
  chunks: Record<string, Receipt>; mediaID?: string | number; originalMediaID?: string | number; imageEdits?: ImageImportEdits; error?: string;
}
export type MediaImportStatus = Omit<Manifest, 'tokenHash' | 'version'> & { chunkSize: number; receivedBytes: number; received: number[] }
const allowed: Record<string, string[]> = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/avif': ['.avif'], 'image/svg+xml': ['.svg'], 'image/x-icon': ['.ico'], 'image/vnd.microsoft.icon': ['.ico'], 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'audio/mpeg': ['.mp3'], 'text/vtt': ['.vtt'], 'application/pdf': ['.pdf'] }
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex')
export const mediaImportFingerprint = (size: number, hashes: string[]) => hash(`mis-media-import-v1:${size}:${MEDIA_CHUNK_BYTES}:${hashes.join('')}`)
export function mediaImportLimits() {
  const positive = (value: string | undefined, fallback: number) => value && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback
  return { chunkSize: MEDIA_CHUNK_BYTES, maxFileBytes: Math.min(mediaLimits().maxFileBytes, 512 * 1024 * 1024), stagingMaxBytes: positive(process.env.MEDIA_IMPORT_STORAGE_MAX_BYTES, 2 * 1024 ** 3), ttlSeconds: Math.min(604800, Math.max(60, positive(process.env.MEDIA_IMPORT_TTL_SECONDS, 86400))) }
}

async function privateRoot(payload: Payload) {
  const root = path.resolve(process.env.MEDIA_IMPORT_ROOT || '.data/media-imports')
  await mkdir(root, { recursive: true, mode: 0o700 })
  if ((await lstat(root)).isSymbolicLink()) throw new MediaError('Le stockage temporaire doit être un répertoire local privé.', 503)
  const resolved = await realpath(root)
  const publicRoot = await realpath(path.resolve('public')).catch(() => path.resolve('public'))
  const mediaRoot = await realpath(path.resolve(payload.collections.media.config.upload.staticDir || '.data/media')).catch(() => path.resolve(payload.collections.media.config.upload.staticDir || '.data/media'))
  const normalize = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value
  if ([publicRoot, mediaRoot].some(directory => normalize(resolved) === normalize(directory) || normalize(resolved).startsWith(normalize(directory + path.sep)))) throw new MediaError('Le stockage des imports ne peut être exposé publiquement.', 503)
  return resolved
}
function sessionPath(root: string, id: unknown) {
  if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw new MediaError('Session d’import invalide.')
  const directory = path.resolve(root, id)
  if (path.dirname(directory) !== root) throw new MediaError('Chemin d’import invalide.')
  return directory
}
async function readManifest(directory: string): Promise<Manifest> {
  try {
    if (!(await lstat(directory)).isDirectory() || (await lstat(directory)).isSymbolicLink()) throw new MediaError('Session inaccessible.', 404)
    const file = path.join(directory, 'manifest.json')
    const info = await lstat(file)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 128_000) throw new MediaError('Manifeste d’import invalide.', 409)
    const manifest = JSON.parse(await readFile(file, 'utf8')) as Manifest
    if (manifest.version !== 1 || manifest.id !== path.basename(directory) || !manifest.ownerID || !manifest.chunks) throw new MediaError('Manifeste d’import invalide.', 409)
    return manifest
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new MediaError('Session absente ou expirée. Relancez l’import.', 404); throw error }
}
async function atomicWrite(file: string, data: Buffer | string) {
  const temporary = `${file}.tmp-${randomBytes(8).toString('hex')}`
  const handle = await open(temporary, 'wx', 0o600)
  try { await handle.writeFile(data); await handle.sync(); await handle.close(); await rename(temporary, file) }
  catch (error) { await handle.close().catch(() => {}); await unlink(temporary).catch(() => {}); throw error }
}
async function save(directory: string, manifest: Manifest) { manifest.updatedAt = new Date().toISOString(); await atomicWrite(path.join(directory, 'manifest.json'), JSON.stringify(manifest)) }
function alive(pid: number) { try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH' } }
async function locked<T>(payload: Payload, user: User, directory: string, callback: (req: PayloadRequest, afterCommit: Array<() => Promise<void>>) => Promise<T>, parentReq?: PayloadRequest): Promise<T> {
  // This deployment uses SQLite BEGIN IMMEDIATE. Its exclusive writer lease is
  // process-safe and is released by SQLite on a crash, unlike a stale lockfile.
  if (payload.db.name !== 'sqlite') throw new MediaError('Les imports locaux reprenables exigent le verrou transactionnel SQLite configuré.', 503)
  const transactionID = parentReq?.transactionID || await payload.db.beginTransaction()
  if (!transactionID) throw new MediaError('Verrou transactionnel indisponible.', 503)
  const req = parentReq || await createLocalReq({ user }, payload); req.transactionID = transactionID
  const file = path.join(directory, '.lock'); const nonce = randomBytes(16).toString('hex')
  const afterCommit: Array<() => Promise<void>> = []
  let committed = false
  try {
    try {
      const info = await lstat(file); if (!info.isFile() || info.isSymbolicLink()) throw new MediaError('Verrou d’import invalide.', 409)
      const previous = JSON.parse(await readFile(file, 'utf8')) as { pid?: number }
      if (previous.pid && alive(previous.pid)) throw new MediaError('Cet import est en cours de finalisation. Réessayez dans quelques instants.', 409)
      await unlink(file)
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    await atomicWrite(file, JSON.stringify({ pid: process.pid, nonce }))
    for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isFile() && /^(?:\d+\.part|manifest\.json|\.lock)\.tmp-[a-f0-9]{16}$/.test(entry.name)) await unlink(path.join(directory, entry.name))
    const result = await callback(req, afterCommit)
    if (!parentReq) { await payload.db.commitTransaction(transactionID); committed = true }
    for (const finish of afterCommit) await finish()
    return result
  } catch (error) { if (!parentReq && !committed) await payload.db.rollbackTransaction(transactionID); throw error }
  finally {
    try { if ((JSON.parse(await readFile(file, 'utf8')) as { nonce: string }).nonce === nonce) await unlink(file) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
}
function authorized(manifest: Manifest, user: User) {
  if (manifest.ownerID !== String(user.id) && !hasRole(user, ['owner', 'admin'])) throw new MediaError('Cet import appartient à un autre compte.', 403)
}
function active(manifest: Manifest) {
  if (Date.parse(manifest.expiresAt) <= Date.now()) throw new MediaError('Cet import a expiré. Relancez le téléversement.', 410)
  if (manifest.status === 'cancelled') throw new MediaError('Cet import a été annulé.', 410)
}
function verifyToken(manifest: Manifest, token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(manifest.tokenHash))) throw new MediaError('Jeton d’import invalide. Resélectionnez le fichier pour reprendre.', 403)
}
function status(manifest: Manifest): MediaImportStatus {
  const { tokenHash, version, ...visible } = manifest; void tokenHash; void version
  return { ...visible, chunkSize: MEDIA_CHUNK_BYTES, receivedBytes: Object.values(manifest.chunks).reduce((sum, chunk) => sum + chunk.size, 0), received: Object.keys(manifest.chunks).map(Number).sort((a, b) => a - b) }
}
async function cleanupFiles(directory: string, keepManifest = true) {
  // Only flat files with names generated by this service; no recursive deletion or symlink traversal.
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && ((/^\d+\.part(?:\.tmp-[a-f0-9]{16})?$/.test(entry.name)) || /^manifest\.json\.tmp-[a-f0-9]{16}$/.test(entry.name) || (!keepManifest && entry.name === 'manifest.json'))) await unlink(path.join(directory, entry.name))
  }
}
async function manifests(root: string) {
  const result: Manifest[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) if (entry.isDirectory() && /^[a-f0-9]{32}$/.test(entry.name)) {
    const directory = sessionPath(root, entry.name)
    try { result.push(await readManifest(directory)) } catch (error) { if (!(error instanceof MediaError && error.status === 404)) throw error }
  }
  return result
}
async function prune(payload: Payload, user: User, root: string, req: PayloadRequest) {
  for (const manifest of await manifests(root)) if (Date.parse(manifest.expiresAt) <= Date.now()) {
    const directory = sessionPath(root, manifest.id)
    try { await locked(payload, user, directory, async () => { await cleanupFiles(directory, false) }, req); await rmdir(directory) } catch (error) { if (!(error instanceof MediaError && error.status === 409) && !['ENOENT', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code || '')) throw error }
  }
}

export async function startMediaImport(payload: Payload, user: PayloadRequest['user'], input: { name: unknown; type: unknown; size: unknown; fingerprint: unknown; collection?: unknown; resumeID?: unknown; imageEdits?: unknown }) {
  requireMediaEditor(user)
  const limits = mediaImportLimits()
  if (typeof input.name !== 'string' || input.name.length > 180 || input.name !== path.basename(input.name) || /[\\/\u0000-\u001f]/.test(input.name)) throw new MediaError('Nom de fichier invalide.')
  if (typeof input.type !== 'string' || !allowed[input.type]?.includes(path.extname(input.name).toLowerCase())) throw new MediaError('Format de fichier non autorisé.')
  if (typeof input.size !== 'number' || !Number.isSafeInteger(input.size) || input.size <= 0 || input.size > limits.maxFileBytes) throw new MediaError('Taille de fichier hors limite pour un import reprenable.', 413)
  if (typeof input.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(input.fingerprint)) throw new MediaError('Empreinte du fichier invalide.')
  if (input.collection != null && (typeof input.collection !== 'string' || input.collection.length > 120)) throw new MediaError('Collection invalide.')
  const imageEdits = normalizeImageEdits(input.imageEdits, input.type)
  const sameEdits = (stored: ImageImportEdits | undefined) => JSON.stringify(stored || null) === JSON.stringify(imageEdits || null)
  const root = await privateRoot(payload)
  const size = input.size
  return locked(payload, user, root, async req => {
    await prune(payload, user, root, req)
    const all = await manifests(root)
    const existing = input.resumeID ? await readManifest(sessionPath(root, input.resumeID)) : all.find(item => item.ownerID === String(user.id) && item.fingerprint === input.fingerprint && item.size === input.size && item.type === input.type && sameEdits(item.imageEdits) && item.status !== 'cancelled')
    const token = randomBytes(32).toString('hex')
    if (existing) {
      authorized(existing, user); active(existing)
      if (existing.fingerprint !== input.fingerprint || existing.size !== input.size || existing.type !== input.type || !sameEdits(existing.imageEdits)) throw new MediaError('Ce fichier ou ce cadrage ne correspond pas à l’import interrompu.', 409)
      const directory = sessionPath(root, existing.id)
      return locked(payload, user, directory, async () => { const current = await readManifest(directory); current.tokenHash = hash(token); await save(directory, current); return { ...status(current), token, resumed: true } }, req)
    }
    const pending = all.filter(item => !['complete', 'cancelled'].includes(item.status))
    if (pending.filter(item => item.ownerID === String(user.id)).length >= 8 || pending.length >= 256 || all.length >= 1024) throw new MediaError('La limite de sessions d’import est atteinte. Terminez les imports en attente ou attendez leur expiration.', 429)
    const reserved = pending.reduce((sum, item) => sum + item.size, 0)
    const reservedMedia = pending.reduce((sum, item) => sum + item.size * (item.imageEdits?.crop ? 2 : 1), 0)
    const storage = await storageObservation(payload)
    if ((reserved + size) * 2 > limits.stagingMaxBytes || (storage.available && storage.bytes + reservedMedia + size * (imageEdits?.crop ? 2 : 1) > storage.maxStorageBytes)) throw new MediaError('Le quota disponible ne permet pas de réserver cet import et ses images conservées.', 413)
    const now = new Date().toISOString(); const id = randomBytes(16).toString('hex')
    const manifest: Manifest = { version: 1, id, ownerID: String(user.id), tokenHash: hash(token), name: input.name as string, type: input.type as string, size: input.size as number, fingerprint: input.fingerprint as string, collection: String(input.collection || ''), createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + limits.ttlSeconds * 1000).toISOString(), status: 'receiving', chunks: {}, ...(imageEdits ? { imageEdits } : {}) }
    const directory = sessionPath(root, id); await mkdir(directory, { mode: 0o700 }); await save(directory, manifest)
    return { ...status(manifest), token, resumed: false }
  })
}
export async function listMediaImports(payload: Payload, user: PayloadRequest['user']) {
  requireMediaEditor(user); const root = await privateRoot(payload)
  await locked(payload, user, root, req => prune(payload, user, root, req))
  return { imports: (await manifests(root)).filter(item => item.status !== 'cancelled' && (item.ownerID === String(user.id) || hasRole(user, ['owner', 'admin']))).map(status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), limits: mediaImportLimits() }
}
export async function getMediaImport(payload: Payload, user: PayloadRequest['user'], input: { id: unknown; token: unknown }) {
  requireMediaEditor(user); const manifest = await readManifest(sessionPath(await privateRoot(payload), input.id)); authorized(manifest, user); active(manifest); verifyToken(manifest, input.token); return status(manifest)
}
export async function putMediaChunk(payload: Payload, user: PayloadRequest['user'], input: { id: unknown; token: unknown; index: unknown; data: Buffer }) {
  requireMediaEditor(user); const directory = sessionPath(await privateRoot(payload), input.id)
  return locked(payload, user, directory, async () => {
    const manifest = await readManifest(directory); authorized(manifest, user); active(manifest); verifyToken(manifest, input.token)
    if (manifest.status === 'complete') return status(manifest)
    if (!(typeof input.index === 'number' || (typeof input.index === 'string' && /^\d+$/.test(input.index)))) throw new MediaError('Numéro de fragment invalide.')
    const index = Number(input.index); const count = Math.ceil(manifest.size / MEDIA_CHUNK_BYTES)
    if (!Number.isSafeInteger(index) || index < 0 || index >= count || !Buffer.isBuffer(input.data) || input.data.length !== Math.min(MEDIA_CHUNK_BYTES, manifest.size - index * MEDIA_CHUNK_BYTES)) throw new MediaError('Fragment incomplet ou numéro invalide.')
    const receipt = { sha256: hash(input.data), size: input.data.length }; const file = path.join(directory, `${index}.part`)
    try { const info = await lstat(file); if (!info.isFile() || info.isSymbolicLink() || hash(await readFile(file)) !== receipt.sha256) throw new MediaError('Ce fragment existe avec un contenu différent.', 409) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') await atomicWrite(file, input.data); else throw error }
    manifest.chunks[String(index)] = receipt; manifest.status = 'receiving'; delete manifest.error; await save(directory, manifest)
    return status(manifest)
  })
}
export async function cancelMediaImport(payload: Payload, user: PayloadRequest['user'], id: unknown) {
  requireMediaEditor(user); const directory = sessionPath(await privateRoot(payload), id)
  return locked(payload, user, directory, async () => { const manifest = await readManifest(directory); authorized(manifest, user); if (manifest.status === 'complete') throw new MediaError('Le média est déjà créé. Gérez sa diffusion dans sa fiche.', 409); manifest.status = 'cancelled'; await save(directory, manifest); await cleanupFiles(directory); return { cancelled: true } })
}
export async function finalizeMediaImport(payload: Payload, user: PayloadRequest['user'], input: { id: unknown; token: unknown }) {
  requireMediaEditor(user); const directory = sessionPath(await privateRoot(payload), input.id)
  return locked(payload, user, directory, async (req, afterCommit) => {
    const manifest = await readManifest(directory); authorized(manifest, user); active(manifest); verifyToken(manifest, input.token)
    const sourceKey = `resumable:${manifest.id}`
    const existing = await payload.find({ collection: 'media', where: { sourceKey: { equals: sourceKey } }, limit: 1, depth: 0, req, overrideAccess: false })
    if (existing.docs.length) {
      manifest.status = 'complete'; manifest.mediaID = existing.docs[0].id
      if (manifest.imageEdits?.crop && !manifest.originalMediaID) { const source = await payload.find({ collection: 'media', where: { sourceKey: { equals: `${sourceKey}:original` } }, limit: 1, depth: 0, req, overrideAccess: false }); manifest.originalMediaID = source.docs[0]?.id }
      delete manifest.error; await save(directory, manifest); await cleanupFiles(directory); return { ...status(manifest), media: existing.docs[0] as LibraryMedia }
    }
    const count = Math.ceil(manifest.size / MEDIA_CHUNK_BYTES)
    if (Object.keys(manifest.chunks).length !== count) throw new MediaError('Des fragments manquent. Resélectionnez le fichier pour reprendre.', 409)
    manifest.status = 'processing'; delete manifest.error; await save(directory, manifest)
    try {
      const data = Buffer.allocUnsafe(manifest.size); const hashes: string[] = []
      for (let index = 0; index < count; index++) {
        const file = path.join(directory, `${index}.part`); const info = await lstat(file)
        if (!info.isFile() || info.isSymbolicLink()) throw new MediaError('Fragment stocké invalide.', 409)
        const chunk = await readFile(file); const receipt = manifest.chunks[index]
        if (chunk.length !== receipt.size || hash(chunk) !== receipt.sha256) throw new MediaError('Un fragment stocké a changé. Annulez puis recommencez cet import.', 409)
        hashes.push(receipt.sha256); chunk.copy(data, index * MEDIA_CHUNK_BYTES)
      }
      if (mediaImportFingerprint(manifest.size, hashes) !== manifest.fingerprint) throw new MediaError('L’empreinte complète du fichier ne correspond pas à la source.', 409)
      await validateMediaFile({ data, name: manifest.name, mimetype: manifest.type, size: manifest.size })
      const edits = normalizeImageEdits(manifest.imageEdits, manifest.type)
      const cropped = edits?.crop ? await cropImportImage(data, manifest.name, manifest.type, edits) : null
      req.query = { ...req.query, uploadEdits: { focalPoint: { x: edits?.focalX ?? 50, y: edits?.focalY ?? 50 } } }
      const original = await payload.create({ collection: 'media', req, overrideAccess: false, depth: 0, file: { data, name: manifest.name, mimetype: manifest.type, size: manifest.size }, data: { sourceKey: cropped ? `${sourceKey}:original` : sourceKey, alt: manifest.name, collection: manifest.collection, visibility: 'restricted', ...(cropped ? { tags: ['original-conservé'], authorization: 'Source complète conservée pour un recadrage. Les droits de diffusion restent à vérifier.' } : {}) } }) as LibraryMedia
      let media = original
      if (cropped) {
        req.query = { ...req.query, uploadEdits: { focalPoint: { x: cropped.focalX, y: cropped.focalY } } }
        media = await payload.create({ collection: 'media', req, overrideAccess: false, depth: 0, file: cropped, data: { sourceKey, alt: `${manifest.name} — recadrage`, collection: manifest.collection, visibility: 'restricted', tags: ['recadrage'], authorization: `Image dérivée de la source conservée #${original.id}. Cadrage relatif : ${JSON.stringify(edits!.crop)}. Les droits de diffusion restent à vérifier.` } }) as LibraryMedia
        manifest.originalMediaID = original.id
      }
      manifest.status = 'complete'; manifest.mediaID = media.id
      afterCommit.push(async () => { await save(directory, manifest); await cleanupFiles(directory) })
      return { ...status(manifest), media }
    } catch (error) { manifest.status = 'failed'; manifest.error = error instanceof Error ? error.message.slice(0, 500) : 'Traitement interrompu.'; await save(directory, manifest); throw error }
  })
}
