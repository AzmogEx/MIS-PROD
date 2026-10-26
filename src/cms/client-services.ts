import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { lstat, readdir, realpath } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import type { Payload, PayloadRequest } from 'payload'

export type UserIdentity = { id: string | number; role?: string | null; roles?: string[] | null }
export type Relation = string | number | { id: string | number } | null | undefined
export type ProjectRecord = { id: string | number; title: string; members?: Relation[]; archived?: boolean; description?: string | null; status?: string }
export const privateFilesDirectory = path.resolve(process.env.CMS_PRIVATE_FILES_DIR || '.cms/private')

export function privateFileLimits() {
  const positive = (value: string | undefined, fallback: number) => value && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback
  return { maxFileBytes: positive(process.env.CMS_PRIVATE_UPLOAD_MAX_BYTES, 250 * 1024 * 1024), maxStorageBytes: positive(process.env.CMS_PRIVATE_STORAGE_MAX_BYTES, 10 * 1024 ** 3) }
}
export async function privateStorageObservation(directory = privateFilesDirectory) {
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { observedAt: new Date().toISOString(), bytes: 0, files: 0, ...privateFileLimits() }; throw error }
  let bytes = 0, files = 0
  for (const entry of entries) if (entry.isFile()) { const info = await lstat(path.join(directory, entry.name)); if (info.isFile() && !info.isSymbolicLink()) { bytes += info.size; files++ } }
  return { observedAt: new Date().toISOString(), bytes, files, ...privateFileLimits() }
}

export function relationID(value: Relation): string | number | undefined {
  return value && typeof value === 'object' ? value.id : value == null ? undefined : value
}

export function isClientStaff(user: UserIdentity | null | undefined): boolean {
  const roles = user?.roles || (user?.role ? [user.role] : [])
  return roles.some((role) => ['owner', 'admin', 'sales'].includes(role))
}

export function isProjectMember(project: ProjectRecord, user: UserIdentity | null | undefined): boolean {
  if (!user) return false
  if (isClientStaff(user)) return true
  return !project.archived && Boolean(project.members?.some((member) => String(relationID(member)) === String(user.id)))
}

export function isUnexpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return !expiresAt || (Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now)
}

export function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newShareToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: tokenDigest(token) }
}

export function safeEqualSecret(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function privateFilePath(filename: string): string {
  if (!filename || filename !== path.basename(filename) || /[\\/\u0000]/.test(filename)) throw new Error('Nom de fichier invalide.')
  const resolved = path.resolve(privateFilesDirectory, filename)
  if (path.dirname(resolved) !== privateFilesDirectory) throw new Error('Chemin de fichier invalide.')
  return resolved
}

export function validateTimecode(value: unknown, duration?: number | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const seconds = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400 || (duration != null && seconds > duration)) {
    throw new Error('Le repère vidéo doit être compris dans la durée de cette version.')
  }
  return Math.round(seconds * 1000) / 1000
}

export async function getAuthorizedProject(payload: Payload, projectID: Relation, user: UserIdentity | null | undefined, req?: PayloadRequest): Promise<ProjectRecord> {
  if (!user || relationID(projectID) === undefined) throw new Error('Projet inaccessible.')
  const project = await payload.findByID({ collection: 'projects', id: relationID(projectID)!, depth: 0, overrideAccess: true, req }) as unknown as ProjectRecord
  if (!project || !isProjectMember(project, user)) throw new Error('Projet inaccessible.')
  return project
}

export async function getAuthorizedPrivateFile(payload: Payload, fileID: string | number, user: UserIdentity | null | undefined) {
  const file = await payload.findByID({ collection: 'private-files', id: fileID, depth: 0, overrideAccess: true })
  await getAuthorizedProject(payload, file.project as Relation, user)
  if (!isClientStaff(user) && !file.clientVisible) {
    const deliveries = await payload.find({ collection: 'deliverables', where: { and: [{ file: { equals: file.id } }, { project: { equals: relationID(file.project as Relation) } }, { clientVisible: { equals: true } }] }, limit: 1, depth: 0, overrideAccess: true })
    if (!deliveries.totalDocs) throw new Error('Fichier non partagé.')
  }
  return file
}

export function requireSameOrigin(request: Request): void {
  const refused = () => new Error('Origine de requête refusée.')
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw refused()
  const requestURL = new URL(request.url)
  const host = request.headers.get('host')
  let directOrigin = requestURL.origin
  if (host) {
    // Next can reconstruct request.url with localhost while the browser uses
    // 127.0.0.1. Browsers control Host; never trust arbitrary forwarded hosts.
    let directURL: URL
    try { directURL = new URL(`${requestURL.protocol}//${host}`) } catch { throw refused() }
    if (directURL.username || directURL.password || directURL.pathname !== '/' || directURL.search || directURL.hash) throw refused()
    directOrigin = directURL.origin
  }
  const allowed = new Set([directOrigin])
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    // A deployment may terminate HTTPS before the internal Next HTTP server.
    // Only the explicitly configured public origin authorizes that case.
    try {
      const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL)
      if (['http:', 'https:'].includes(canonical.protocol) && !canonical.username && !canonical.password) allowed.add(canonical.origin)
    } catch { /* Invalid configuration cannot authorize an extra origin. */ }
  }
  const origin = request.headers.get('origin')
  if (origin && !allowed.has(origin)) throw refused()
}

export function formatTimecode(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

export async function servePrivateFile(request: Request, record: Record<string, unknown>): Promise<Response> {
  const file = record as { filename?: string | null; mimeType?: string | null; revoked?: boolean | null; expiresAt?: string | null }
  const unavailable = () => new Response('Fichier indisponible.', { status: 404, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  if (file.revoked || !isUnexpired(file.expiresAt) || !file.filename) return unavailable()
  const fullPath = privateFilePath(file.filename)
  const info = await lstat(fullPath)
  if (!info.isFile() || info.isSymbolicLink() || path.dirname(await realpath(fullPath)) !== await realpath(privateFilesDirectory) || info.size === 0) return unavailable()
  const headers = new Headers({ 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Type': file.mimeType || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Security-Policy': "default-src 'none'; sandbox" })
  const disposition = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/') || file.mimeType?.startsWith('image/') ? 'inline' : 'attachment'
  headers.set('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
  const range = request.headers.get('range')
  let start = 0
  let end = info.size - 1
  let status = 200
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}`, 'Cache-Control': 'no-store' } })
    if (!match[1]) { start = Math.max(0, info.size - Number(match[2])) } else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size || start < 0) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}`, 'Cache-Control': 'no-store' } })
    status = 206
    headers.set('Content-Range', `bytes ${start}-${end}/${info.size}`)
  }
  headers.set('Content-Length', String(end - start + 1))
  if (request.method === 'HEAD') return new Response(null, { status, headers })
  return new Response(Readable.toWeb(createReadStream(fullPath, { start, end })) as ReadableStream, { status, headers })
}
