import { getCMS } from '@/cms/payload'
import { requireSameOrigin } from '@/cms/client-services'
import { getMediaUsage, listMedia, mediaID, MediaError, replaceMediaReferences, requireMediaEditor, updateMediaMetadata } from '@/cms/media-services'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
const failure = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : 'Opération média impossible.' }, { status: error instanceof MediaError ? error.status : error instanceof Error && /Origine/.test(error.message) ? 403 : 400, headers })

export async function GET(request: Request) {
  try {
    const cms = await getCMS(); const { user } = await cms.auth({ headers: request.headers }); requireMediaEditor(user)
    const query = new URL(request.url).searchParams
    if (query.get('action') === 'usage') return Response.json(await getMediaUsage(cms, user, mediaID(query.get('id'))), { headers })
    return Response.json(await listMedia(cms, user, { query: query.get('q') || '', collection: query.get('collection') || '', tag: query.get('tag') || '', type: query.get('type') || '', page: Number(query.get('page')) || 1 }), { headers })
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const cms = await getCMS(); const { user } = await cms.auth({ headers: request.headers }); requireMediaEditor(user)
    if (Number(request.headers.get('content-length') || 0) > 1_000_000) throw new MediaError('Requête trop volumineuse.', 413)
    const text = await request.text(); if (text.length > 1_000_000) throw new MediaError('Requête trop volumineuse.', 413)
    const body = JSON.parse(text) as Record<string, unknown>
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MediaError('Requête invalide.')
    if (body.action === 'replace') return Response.json(await replaceMediaReferences(cms, user, { fromID: body.fromID, toID: body.toID, fingerprint: body.fingerprint }), { headers })
    if (body.action === 'metadata') return Response.json(await updateMediaMetadata(cms, user, { ids: body.ids, patch: body.patch, revisions: body.revisions }), { headers })
    throw new MediaError('Action inconnue.')
  } catch (error) { return failure(error) }
}
