import path from 'node:path'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, stat, link, unlink, open } from 'node:fs/promises'
import sharp from 'sharp'
import type { Payload, PayloadRequest } from 'payload'
import { hasRole } from './access'
import type { FormAnswers, PublicForm } from './form-schema'
import { acquireSubmissionSlot, getPublishedForm, SubmissionError } from './operations'

export const briefFileLimit = 10 * 1024 * 1024
const tokenPattern = /^bf_([a-f0-9]{64})$/
type StoredFile = { token: string; form: string; field: string; submissionHash: string; filename: string; mimeType: string; bytes: number; sha256: string; createdAt: string; expiresAt: string; content: string }
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const directory = () => path.resolve(process.env.CMS_BRIEF_FILES_DIR || '.data/brief-files')
function filename(token: string) { if (!tokenPattern.test(token)) throw new SubmissionError('Référence de pièce jointe invalide.', 422); return path.join(directory(), `${token}.json`) }

async function lockStorage() {
  const lock = path.join(directory(), '.quota.lock')
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const handle = await open(lock, 'wx', 0o600)
      try { await handle.writeFile(JSON.stringify({ pid: process.pid })) } catch (error) { await handle.close(); await unlink(lock); throw error }
      return async () => { await handle.close(); await unlink(lock) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      try {
        if (Date.now() - (await stat(lock)).mtimeMs > 180_000) {
          const owner = JSON.parse(await readFile(lock, 'utf8')) as { pid?: number }
          if (Number.isInteger(owner.pid) && Number(owner.pid) > 0) {
            try { process.kill(Number(owner.pid), 0) } catch (processError) {
              if ((processError as NodeJS.ErrnoException).code === 'ESRCH') await unlink(lock)
            }
          }
        }
      } catch (lockError) { if ((lockError as NodeJS.ErrnoException).code !== 'ENOENT') throw lockError }
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
  throw new SubmissionError('Stockage occupé. Réessayez le téléversement dans quelques secondes.', 503)
}

async function readStored(token: string): Promise<StoredFile> {
  const file = filename(token)
  if ((await stat(file)).size > briefFileLimit * 1.4 + 65536) throw new SubmissionError('Pièce jointe corrompue.', 422)
  const stored = JSON.parse(await readFile(file, 'utf8')) as StoredFile
  const bytes = Buffer.from(stored.content, 'base64')
  if (stored.token !== token || bytes.length !== stored.bytes || bytes.length > briefFileLimit || digest(bytes) !== stored.sha256) throw new SubmissionError('Pièce jointe corrompue.', 422)
  return stored
}

export async function readBriefUploadBody(request: Request): Promise<Buffer> {
  if (!request.body || Number(request.headers.get('content-length') || 0) > briefFileLimit) throw new SubmissionError('Pièce jointe limitée à 10 Mo.', 413)
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > briefFileLimit) { await reader.cancel(); throw new SubmissionError('Pièce jointe limitée à 10 Mo.', 413) } chunks.push(chunk.value) }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

async function checkFile(bytes: Buffer, mimeType: string, originalName: string) {
  if (!bytes.length || bytes.length > briefFileLimit) throw new SubmissionError('Pièce jointe vide ou supérieure à 10 Mo.', 413)
  const names: Record<string, string[]> = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }
  if (!names[mimeType]?.includes(path.extname(originalName).toLowerCase())) throw new SubmissionError('Formats acceptés : PDF, JPEG, PNG et WebP.', 415)
  if (mimeType === 'application/pdf') {
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-' || !bytes.subarray(Math.max(0, bytes.length - 2048)).includes(Buffer.from('%%EOF'))) throw new SubmissionError('Le contenu ne correspond pas à un PDF.', 415)
  } else {
    try {
      const metadata = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'error' }).metadata()
      if ({ 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType] !== metadata.format || !metadata.width || !metadata.height) throw new Error('format')
      await sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'error' }).resize(1, 1).toBuffer()
    } catch { throw new SubmissionError('L’image ne peut pas être décodée ou dépasse 40 mégapixels.', 415) }
  }
}

export async function storeBriefUpload(payload: Payload, input: { formSlug: string; field: string; submissionKey: string; uploadKey: string; name: string; mimeType: string; bytes: Buffer; rateKey: string }) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.submissionKey) || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.uploadKey)) throw new SubmissionError('Clé de téléversement invalide.', 400)
  const form = await getPublishedForm(payload, input.formSlug)
  if (!form?.fields.some(field => field.key === input.field && field.type === 'file')) throw new SubmissionError('Cette pièce jointe ne fait pas partie d’un formulaire publié.', 422)
  const secret = process.env.PAYLOAD_SECRET
  if (!secret || secret.length < 32) throw new SubmissionError('Stockage sécurisé indisponible.', 503)
  const token = `bf_${createHmac('sha256', secret).update(`${form.id}:${input.field}:${input.submissionKey}:${input.uploadKey}`).digest('hex')}`
  const file = filename(token), hash = digest(input.bytes)
  try {
    const existing = await readStored(token)
    if (existing.sha256 !== hash || existing.mimeType !== input.mimeType) throw new SubmissionError('Cette clé désigne déjà un autre fichier. Sélectionnez à nouveau la pièce jointe.', 409)
    return { token, filename: existing.filename, bytes: existing.bytes, duplicate: true }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  if (!await acquireSubmissionSlot(payload, `brief-upload:${input.rateKey}`, new Date(), 6)) throw new SubmissionError('Trop de fichiers envoyés. Réessayez dans une minute.', 429)
  await checkFile(input.bytes, input.mimeType, input.name)
  await mkdir(directory(), { recursive: true })
  const release = await lockStorage()
  try {
  try {
    const existing = await readStored(token)
    if (existing.sha256 !== hash || existing.mimeType !== input.mimeType) throw new SubmissionError('Conflit de fichier : choisissez une nouvelle pièce jointe.', 409)
    return { token, filename: existing.filename, bytes: existing.bytes, duplicate: true }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const entries = await readdir(directory())
  let usage = 0
  for (const entry of entries) usage += (await stat(path.join(directory(), entry))).size
  const quota = Number(process.env.CMS_BRIEF_STORAGE_MAX_BYTES || 1024 * 1024 * 1024)
  const now = new Date()
  const stored: StoredFile = { token, form: String(form.id), field: input.field, submissionHash: digest(input.submissionKey),
    filename: path.basename(input.name.replaceAll('\\', '/')).replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').slice(0, 120) || 'piece-jointe',
    mimeType: input.mimeType, bytes: input.bytes.length, sha256: hash, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), content: input.bytes.toString('base64'),
  }
  const serialized = JSON.stringify(stored)
  if (!Number.isFinite(quota) || usage + Buffer.byteLength(serialized) > quota) throw new SubmissionError('Stockage des pièces jointes momentanément indisponible.', 507)
  const temporary = path.join(directory(), `${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, serialized, { flag: 'wx', mode: 0o600 })
    // A hard link publishes the complete immutable file atomically; EEXIST can
    // never replace another upload, even when two retries arrive concurrently.
    try { await link(temporary, file) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const existing = await readStored(token)
      if (existing.sha256 !== hash || existing.mimeType !== input.mimeType) throw new SubmissionError('Conflit de fichier : choisissez une nouvelle pièce jointe.', 409)
    }
  } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }) }
  return { token, filename: stored.filename, bytes: stored.bytes, duplicate: false }
  } finally { await release() }
}

export async function validateBriefFiles(form: PublicForm, answers: FormAnswers, submissionKey: string) {
  const uploads = form.fields.filter(field => field.type === 'file' && answers[field.key])
  if (uploads.length > 3) throw new SubmissionError('Trois pièces jointes maximum par demande.', 422)
  for (const field of uploads) {
    try {
      const stored = await readStored(String(answers[field.key]))
      if (stored.form !== String(form.id) || stored.field !== field.key || stored.submissionHash !== digest(submissionKey) || Date.parse(stored.expiresAt) <= Date.now()) throw new Error('binding')
    } catch { throw new SubmissionError('Une pièce jointe est expirée, invalide ou rattachée à une autre demande. Sélectionnez-la à nouveau.', 422, { [field.key]: 'Téléversez à nouveau cette pièce jointe.' }) }
  }
}

export async function readBriefFile(payload: Payload, user: PayloadRequest['user'], briefID: string, field: string) {
  if (!hasRole(user, ['owner', 'admin', 'sales'])) throw new SubmissionError('Accès commercial requis.', user ? 403 : 401)
  const brief = await payload.findByID({ collection: 'briefs', id: briefID, user: user!, overrideAccess: false, depth: 0 })
  const schema = brief.schemaSnapshot as PublicForm
  const token = (brief.answers as FormAnswers)?.[field]
  if (!schema?.fields?.some(item => item.type === 'file' && item.key === field) || typeof token !== 'string') throw new SubmissionError('Pièce jointe introuvable.', 404)
  const stored = await readStored(token)
  if (stored.form !== String(schema.id) || stored.field !== field) throw new SubmissionError('Pièce jointe introuvable.', 404)
  return { filename: stored.filename, mimeType: stored.mimeType, bytes: Buffer.from(stored.content, 'base64') }
}

/** Remove only expired, unreferenced uploads; trash still retains its files. */
export async function purgeExpiredBriefUploads(payload: Payload, now = new Date()) {
  let entries: string[]
  try { entries = await readdir(directory()) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { deleted: 0 }; throw error }
  const used = new Set<string>()
  for (let page = 1; ; page += 1) {
    const briefs = await payload.find({ collection: 'briefs', trash: true, limit: 200, page, depth: 0, select: { answers: true }, overrideAccess: true })
    for (const brief of briefs.docs) for (const value of Object.values(brief.answers || {})) if (typeof value === 'string' && tokenPattern.test(value)) used.add(value)
    if (!briefs.hasNextPage) break
  }
  let deleted = 0
  for (const entry of entries) {
    if (/^[a-f0-9-]{36}\.tmp$/.test(entry)) {
      const temporary = path.join(directory(), entry)
      if (now.getTime() - (await stat(temporary)).mtimeMs > 2 * 86_400_000) { await unlink(temporary); deleted += 1 }
      continue
    }
    const token = entry.replace(/\.json$/, '')
    if (!tokenPattern.test(token) || used.has(token)) continue
    const stored = await readStored(token)
    // 24-hour grace after upload expiry excludes in-flight valid submissions.
    if (Date.parse(stored.expiresAt) + 86_400_000 < now.getTime()) { await unlink(filename(token)); deleted += 1 }
  }
  return { deleted }
}
