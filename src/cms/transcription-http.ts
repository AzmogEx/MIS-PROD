import type { Payload } from 'payload'
import { isAIStaff, type AIConfiguration } from './ai'
import { requireSameOrigin } from './client-services'
import { listTranscriptionSources, transcribeFile, transcriptionAvailability, TranscriptionError } from './transcription'

export function transcriptionHandlers(getCMS: () => Promise<Payload>) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
  const failed = (error: unknown) => json({ error: error instanceof TranscriptionError ? error.message : 'La transcription locale est momentanément indisponible.' }, error instanceof TranscriptionError ? error.status : 503)
  return {
    GET: async (request: Request) => {
      try {
        const payload = await getCMS(); const { user } = await payload.auth({ headers: request.headers })
        if (!user || !isAIStaff(user)) throw new TranscriptionError('Accès réservé à l’équipe MIS.', user ? 403 : 401)
        const url = new URL(request.url); const page = Number(url.searchParams.get('page') || 1)
        if (!Number.isSafeInteger(page) || page < 1) throw new TranscriptionError('Page invalide.')
        const settings = await payload.findGlobal({ slug: 'ai-settings', overrideAccess: true }) as unknown as AIConfiguration
        return json({ ...transcriptionAvailability(settings), ...await listTranscriptionSources(payload, user, url.searchParams.get('search') || '', page) })
      } catch (error) { return failed(error) }
    },
    POST: async (request: Request) => {
      try {
        try { requireSameOrigin(request) } catch { throw new TranscriptionError('Origine de requête refusée.', 403) }
        const payload = await getCMS(); const { user } = await payload.auth({ headers: request.headers })
        if (!user || !isAIStaff(user)) throw new TranscriptionError('Accès réservé à l’équipe MIS.', user ? 403 : 401)
        if (!request.headers.get('content-type')?.startsWith('application/json')) throw new TranscriptionError('Une référence JSON est requise.', 415)
        const reader = request.body?.getReader(); if (!reader) throw new TranscriptionError('Référence requise.')
        const parts: Uint8Array[] = []; let size = 0
        try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 2048) throw new TranscriptionError('Requête trop volumineuse.', 413); parts.push(chunk.value) } } finally { await reader.cancel().catch(() => undefined) }
        let input: unknown
        try { input = JSON.parse(Buffer.concat(parts).toString('utf8')) } catch { throw new TranscriptionError('Référence JSON invalide.') }
        return json(await transcribeFile(payload, user, input))
      } catch (error) { return failed(error) }
    },
  }
}
