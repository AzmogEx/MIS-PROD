import { getCMS } from '@/cms/payload'
import { requireSameOrigin } from '@/cms/client-services'
import { abuseKey, SubmissionError } from '@/cms/operations'
import { readBriefUploadBody, storeBriefUpload } from '@/cms/brief-files'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
export async function POST(request: Request) {
  try { requireSameOrigin(request) } catch { return Response.json({ error: 'Origine non autorisée.' }, { status: 403, headers }) }
  try {
    const query = new URL(request.url).searchParams
    const address = process.env.CMS_TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local'
    let name: string
    try { name = decodeURIComponent(request.headers.get('x-file-name') || '') } catch { throw new SubmissionError('Nom de fichier invalide.', 400) }
    const result = await storeBriefUpload(await getCMS(), { formSlug: query.get('form') || '', field: query.get('field') || '', submissionKey: request.headers.get('x-idempotency-key') || '', uploadKey: request.headers.get('x-upload-key') || '', name, mimeType: request.headers.get('content-type')?.split(';')[0] || '', bytes: await readBriefUploadBody(request), rateKey: abuseKey(address, process.env.PAYLOAD_SECRET || 'local-upload') })
    return Response.json(result, { status: result.duplicate ? 200 : 201, headers })
  } catch (error) { return Response.json({ error: error instanceof SubmissionError ? error.message : 'Le fichier n’a pas été enregistré. Réessayez.' }, { status: error instanceof SubmissionError ? error.status : 503, headers }) }
}
