import { createHash } from 'node:crypto'
import { lstat, open, realpath } from 'node:fs/promises'
import path from 'node:path'
import type { Payload, PayloadRequest, Where } from 'payload'
import { isAIStaff, reserveAIQuota, type AIConfiguration } from './ai'
import { getAuthorizedPrivateFile, getAuthorizedProject, isUnexpired, type Relation } from './client-services'

type User = NonNullable<PayloadRequest['user']>
export type TranscriptionSource = { collection: 'media' | 'private-files'; id: number; language: 'fr' | 'en' | 'auto'; requestKey: string }
export class TranscriptionError extends Error { constructor(message: string, public status = 400) { super(message) } }

const bounded = (value: string | undefined, fallback: number, maximum: number) => value && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Math.min(Number(value), maximum) : fallback
export function transcriptionLimits() {
  return { maxBytes: bounded(process.env.WHISPER_MAX_AUDIO_BYTES, 25 * 1024 * 1024, 100 * 1024 * 1024), maxSeconds: bounded(process.env.WHISPER_MAX_AUDIO_SECONDS, 900, 3600), timeoutMs: bounded(process.env.WHISPER_TIMEOUT_MS, 180000, 300000), convert: process.env.WHISPER_CONVERT_ENABLED === 'true' }
}
export function localWhisperURL(): URL | undefined {
  try {
    if (!process.env.WHISPER_BASE_URL) return undefined
    const base = new URL(process.env.WHISPER_BASE_URL)
    if (!['127.0.0.1', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') return undefined
    return new URL('/inference', base)
  } catch { return undefined }
}
export function transcriptionAvailability(settings: AIConfiguration) {
  const limits = transcriptionLimits()
  const model = process.env.WHISPER_MODEL?.trim()
  const reason = !settings.enabled ? 'L’assistance IA est désactivée dans les paramètres.' : !localWhisperURL() ? 'Whisper local non configuré : WHISPER_BASE_URL doit cibler 127.0.0.1 ou ::1.' : !model || !/^[a-zA-Z0-9_.-]{1,100}$/.test(model) || /cloud/i.test(model) ? 'WHISPER_MODEL doit nommer le modèle déjà chargé dans le serveur local.' : undefined
  return { available: !reason, reason, provider: 'whisper.cpp local', model, ...limits }
}

function requireStaff(user: PayloadRequest['user']): asserts user is User { if (!user || !isAIStaff(user)) throw new TranscriptionError('Accès réservé à l’équipe MIS.', user ? 403 : 401) }
function validSource(input: unknown): TranscriptionSource {
  const value = input as Partial<TranscriptionSource> | null
  if (!value || !['media', 'private-files'].includes(String(value.collection)) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0 || !['fr', 'en', 'auto'].includes(String(value.language)) || !/^[a-zA-Z0-9-]{20,80}$/.test(value.requestKey || '')) throw new TranscriptionError('Référence de fichier, langue ou identifiant de demande invalide.')
  return value as TranscriptionSource
}
const audioMimes = () => transcriptionLimits().convert ? ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'video/mp4', 'video/webm'] : ['audio/wav', 'audio/x-wav']

export async function listTranscriptionSources(payload: Payload, user: PayloadRequest['user'], search = '', page = 1) {
  requireStaff(user)
  const common: Where = { mimeType: { in: audioMimes() } }
  const read = async (collection: 'media' | 'private-files') => {
    const filters: Where[] = [common]
    if (search.trim()) filters.push({ [collection === 'media' ? 'filename' : 'title']: { like: search.trim().slice(0, 120) } })
    if (collection === 'media') filters.push({ or: [{ rightsUntil: { exists: false } }, { rightsUntil: { greater_than: new Date().toISOString() } }] })
    else filters.push({ revoked: { not_equals: true } }, { 'project.archived': { not_equals: true } }, { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }] })
    try {
      const result = await payload.find({ collection, where: { and: filters }, page: Math.max(1, Math.min(10000, page)), limit: 30, sort: '-createdAt', depth: 0, user, overrideAccess: false })
      return { files: result.docs.map(file => ({ collection, id: file.id, title: String(file.title || file.alt || file.filename), mimeType: file.mimeType, bytes: file.filesize, private: collection === 'private-files' })), hasNextPage: result.hasNextPage }
    } catch (error) { if ((error as { status?: number }).status === 403) return { files: [], hasNextPage: false }; throw error }
  }
  const [media, privateFiles] = await Promise.all([read('media'), read('private-files')])
  return { files: [...media.files, ...privateFiles.files], hasNextPage: media.hasNextPage || privateFiles.hasNextPage }
}

async function readSource(payload: Payload, user: User, source: TranscriptionSource) {
  let record
  try {
    record = await payload.findByID({ collection: source.collection, id: source.id, depth: 0, user, overrideAccess: false })
    if (source.collection === 'private-files') {
      record = await getAuthorizedPrivateFile(payload, source.id, user)
      const project = await getAuthorizedProject(payload, record.project as Relation, user)
      if (project.archived || record.revoked || !isUnexpired(record.expiresAt as string | undefined)) throw new Error('retired')
    } else if (!isUnexpired(record.rightsUntil as string | undefined)) throw new Error('retired')
  } catch { throw new TranscriptionError('Ce fichier est inaccessible ou ses droits ont expiré.', 403) }
  if (!audioMimes().includes(String(record.mimeType))) throw new TranscriptionError('Format indisponible. Sans conversion configurée, utilisez un fichier WAV PCM.')
  const upload = payload.collections[source.collection].config.upload
  if (!upload || !upload.staticDir || upload.disableLocalStorage) throw new TranscriptionError('La transcription nécessite un fichier stocké localement.')
  const name = String(record.filename || '')
  if (!name || name !== path.basename(name) || /[\\/\0]/.test(name)) throw new TranscriptionError('Référence physique invalide.')
  const root = await realpath(upload.staticDir); const target = path.join(root, name)
  if ((await lstat(target)).isSymbolicLink() || path.dirname(await realpath(target)) !== root) throw new TranscriptionError('Référence physique invalide.')
  const file = await open(target, 'r')
  try {
    const info = await file.stat(); const limit = transcriptionLimits().maxBytes
    if (!info.isFile() || info.size <= 0 || info.size > limit) throw new TranscriptionError(`Le fichier doit contenir au plus ${Math.round(limit / 1048576)} Mio.`, 413)
    const data = Buffer.alloc(info.size); const read = await file.read(data, 0, data.length, 0)
    if (read.bytesRead !== info.size || (await file.stat()).size !== info.size) throw new TranscriptionError('Le fichier a changé pendant sa lecture.', 409)
    validateAudio(data, String(record.mimeType))
    return { data, record, mimeType: String(record.mimeType), fingerprint: createHash('sha256').update(data).digest('hex') }
  } finally { await file.close() }
}

function validateAudio(data: Buffer, mime: string) {
  const text = (start: number, end: number) => data.subarray(start, end).toString('ascii')
  if (mime === 'audio/wav' || mime === 'audio/x-wav') {
    if (data.length < 44 || text(0, 4) !== 'RIFF' || text(8, 12) !== 'WAVE' || data.readUInt32LE(4) + 8 !== data.length) throw new TranscriptionError('WAV invalide.')
    let bytesPerSecond = 0; let audioBytes = 0; let channels = 0
    for (let offset = 12; offset + 8 <= data.length;) {
      const size = data.readUInt32LE(offset + 4); const start = offset + 8
      if (start + size > data.length) throw new TranscriptionError('WAV incomplet.')
      if (text(offset, offset + 4) === 'fmt ') {
        if (size < 16 || data.readUInt16LE(start) !== 1 || data.readUInt16LE(start + 14) !== 16 || data.readUInt32LE(start + 4) !== 16000) throw new TranscriptionError('Le WAV doit être PCM 16 bits à 16 kHz, mono ou stéréo.')
        channels = data.readUInt16LE(start + 2); bytesPerSecond = data.readUInt32LE(start + 8)
        if (![1, 2].includes(channels) || bytesPerSecond !== 16000 * channels * 2 || data.readUInt16LE(start + 12) !== channels * 2) throw new TranscriptionError('En-tête WAV incohérent.')
      }
      if (text(offset, offset + 4) === 'data') audioBytes += size
      offset = start + size + size % 2
    }
    if (!bytesPerSecond || !audioBytes || audioBytes % (channels * 2)) throw new TranscriptionError('WAV vide ou incomplet.')
    if (audioBytes / bytesPerSecond > transcriptionLimits().maxSeconds) throw new TranscriptionError('La durée du WAV dépasse la limite de transcription.', 413)
  } else if (!(mime === 'audio/mpeg' && (text(0, 3) === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224))) && !(mime === 'video/mp4' && data.length >= 12 && text(4, 8) === 'ftyp') && !(mime === 'video/webm' && data.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])))) throw new TranscriptionError('La signature du fichier ne correspond pas au format audio/vidéo déclaré.')
}

async function boundedResponse(response: Response) {
  const reader = response.body?.getReader(); if (!reader) throw new Error('empty')
  const parts: Uint8Array[] = []; let total = 0
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; total += chunk.value.length; if (total > 262144) throw new Error('response-size'); parts.push(chunk.value) }
  } finally { await reader.cancel().catch(() => undefined) }
  return JSON.parse(Buffer.concat(parts).toString('utf8')) as { text?: unknown }
}

export async function transcribeFile(payload: Payload, user: PayloadRequest['user'], input: unknown) {
  requireStaff(user)
  const source = validSource(input)
  const settings = await payload.findGlobal({ slug: 'ai-settings', overrideAccess: true }) as unknown as AIConfiguration
  const available = transcriptionAvailability(settings)
  if (!available.available) throw new TranscriptionError(available.reason!, 503)
  const file = await readSource(payload, user, source)
  const key = `${user.id}:transcription:${source.requestKey}`
  const provenance = JSON.stringify({ collection: source.collection, id: source.id, sha256: file.fingerprint, language: source.language, maxSeconds: available.maxSeconds, note: 'Suggestion privée à relire. Aucun contenu ni sous-titre publié automatiquement.' })
  const existing = async () => (await payload.find({ collection: 'ai-requests', where: { requestKey: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const previous = await existing()
  if (previous) { if (previous.input !== provenance) throw new TranscriptionError('Cette demande correspond à une autre source ou configuration.', 409); return previous }
  let request
  try { request = await payload.create({ collection: 'ai-requests', data: { requestKey: key, requestedBy: user.id, task: 'transcription', input: provenance, model: `whisper.cpp:${available.model}`, status: 'pending' }, overrideAccess: true }) }
  catch (error) { const concurrent = await existing(); if (!concurrent) throw error; if (concurrent.input !== provenance) throw new TranscriptionError('Identifiant déjà utilisé pour une autre source.', 409); return concurrent }
  try {
    await reserveAIQuota(payload, settings, request.id)
    const body = new FormData()
    const extension = ({ 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4', 'video/webm': 'webm' } as Record<string, string>)[file.mimeType]
    body.set('file', new Blob([new Uint8Array(file.data)], { type: file.mimeType }), `input.${extension}`)
    body.set('response_format', 'json'); body.set('language', source.language); body.set('temperature', '0.0'); body.set('translate', 'false'); body.set('duration', String(available.maxSeconds * 1000))
    const response = await fetch(localWhisperURL()!, { method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(available.timeoutMs) })
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Whisper a refusé la requête (HTTP ${response.status}).`) }
    const result = await boundedResponse(response)
    if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 60000) throw new Error('Whisper n’a pas retourné de transcription exploitable dans la limite de 60 000 caractères.')
    return await payload.update({ collection: 'ai-requests', id: request.id, data: { status: 'completed', output: result.text.trim() }, overrideAccess: true })
  } catch (error) {
    const diagnostic = error instanceof Error && /quota|budget|réservation|Whisper/.test(error.message) ? error.message : 'Le serveur local est indisponible ou le traitement a dépassé le délai. La réservation est conservée ; aucune reprise automatique.'
    return await payload.update({ collection: 'ai-requests', id: request.id, data: { status: 'failed', error: diagnostic }, overrideAccess: true })
  }
}
