"use client";

import type { LibraryMedia } from '@/cms/media-services'
import type { MediaImportStatus } from '@/cms/media-imports'
import type { ImageImportEdits } from '@/cms/media-image-edits'

const chunkSize = 4 * 1024 * 1024
const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', vtt: 'text/vtt', pdf: 'application/pdf' }
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
async function parse(response: Response) { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Import interrompu. Resélectionnez ce fichier pour reprendre.'); return result }

/** Every byte participates in a SHA-256 tree fingerprint, with only 4 MiB read at once. */
export async function fingerprintFile(file: File) {
  if (!globalThis.crypto?.subtle) throw new Error('La reprise sécurisée exige HTTPS ou localhost pour vérifier l’empreinte du fichier.')
  const hashes: string[] = []
  for (let offset = 0; offset < file.size; offset += chunkSize) hashes.push(hex(await crypto.subtle.digest('SHA-256', await file.slice(offset, offset + chunkSize).arrayBuffer())))
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`mis-media-import-v1:${file.size}:${chunkSize}:${hashes.join('')}`)))
}
function sendChunk(id: string, token: string, index: number, chunk: Blob, progress: (bytes: number) => void): Promise<MediaImportStatus> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open('PUT', `/api/media-imports?id=${id}&index=${index}`); request.setRequestHeader('X-Media-Import-Token', token); request.setRequestHeader('Content-Type', 'application/octet-stream')
    request.upload.onprogress = event => { if (event.lengthComputable) progress(event.loaded) }
    request.onerror = () => reject(new Error('Connexion interrompue. Les fragments confirmés restent conservés ; resélectionnez ce fichier pour reprendre.'))
    request.onload = () => { try { const result = JSON.parse(request.responseText); if (request.status < 200 || request.status >= 300) throw new Error(result.error || 'Fragment refusé.'); resolve(result) } catch (error) { reject(error) } }
    request.send(chunk)
  })
}
export async function uploadFileResumable(file: File, collection: string, progress: (percentage: number) => void, resumeID?: string, imageEdits?: ImageImportEdits): Promise<LibraryMedia> {
  const fingerprint = await fingerprintFile(file)
  const started = await parse(await fetch('/api/media-imports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', name: file.name, size: file.size, type: types[file.name.split('.').pop()?.toLowerCase() || ''] || file.type, fingerprint, collection, resumeID, imageEdits }) })) as MediaImportStatus & { token: string }
  let receivedBytes = started.receivedBytes; const received = new Set(started.received)
  progress(Math.round(receivedBytes / file.size * 100))
  if (started.status !== 'complete') for (let index = 0; index < Math.ceil(file.size / chunkSize); index++) {
    if (received.has(index)) continue
    const result = await sendChunk(started.id, started.token, index, file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize)), sent => progress(Math.min(100, Math.floor((receivedBytes + sent) / file.size * 100))))
    receivedBytes = result.receivedBytes; progress(Math.round(receivedBytes / file.size * 100))
  }
  const completed = await parse(await fetch('/api/media-imports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Media-Import-Token': started.token }, body: JSON.stringify({ action: 'finalize', id: started.id }) }))
  return completed.media
}
