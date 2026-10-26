import type { Payload } from 'payload'
import { requireSameOrigin } from './client-services'
import { MediaError, requireMediaEditor } from './media-services'
import { MEDIA_CHUNK_BYTES, cancelMediaImport, finalizeMediaImport, getMediaImport, listMediaImports, putMediaChunk, startMediaImport } from './media-imports'

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new MediaError('Requête trop volumineuse.', 413)
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0
  if (!reader) return Buffer.alloc(0)
  try {
    while (true) { const result = await reader.read(); if (result.done) break; size += result.value.byteLength; if (size > limit) { await reader.cancel(); throw new MediaError('Requête trop volumineuse.', 413) } chunks.push(result.value) }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, size)
}
const failure = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : 'Import impossible.' }, { status: error instanceof MediaError ? error.status : error instanceof Error && /Origine/.test(error.message) ? 403 : 400, headers })

/** Injectable CMS provider keeps API tests on isolated real databases. */
export function mediaImportHandlers(getCMS: () => Promise<Payload>) {
  const authenticate = async (request: Request) => { const cms = await getCMS(); const { user } = await cms.auth({ headers: request.headers }); requireMediaEditor(user); return { cms, user } }
  return {
    GET: async (request: Request) => {
      try { const { cms, user } = await authenticate(request); const id = new URL(request.url).searchParams.get('id'); return Response.json(id ? await getMediaImport(cms, user, { id, token: request.headers.get('X-Media-Import-Token') }) : await listMediaImports(cms, user), { headers }) } catch (error) { return failure(error) }
    },
    POST: async (request: Request) => {
      try {
        requireSameOrigin(request); const { cms, user } = await authenticate(request)
        const body = JSON.parse((await boundedBody(request, 4096)).toString('utf8')) as Record<string, unknown>
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MediaError('Requête invalide.')
        if (body.action === 'start') return Response.json(await startMediaImport(cms, user, { name: body.name, type: body.type, size: body.size, fingerprint: body.fingerprint, collection: body.collection, resumeID: body.resumeID, imageEdits: body.imageEdits }), { headers })
        if (body.action === 'finalize') return Response.json(await finalizeMediaImport(cms, user, { id: body.id, token: request.headers.get('X-Media-Import-Token') }), { headers })
        if (body.action === 'cancel') return Response.json(await cancelMediaImport(cms, user, body.id), { headers })
        throw new MediaError('Action inconnue.')
      } catch (error) { return failure(error) }
    },
    PUT: async (request: Request) => {
      try {
        requireSameOrigin(request); const { cms, user } = await authenticate(request); const query = new URL(request.url).searchParams
        return Response.json(await putMediaChunk(cms, user, { id: query.get('id'), token: request.headers.get('X-Media-Import-Token'), index: query.get('index'), data: await boundedBody(request, MEDIA_CHUNK_BYTES) }), { headers })
      } catch (error) { return failure(error) }
    },
  }
}
