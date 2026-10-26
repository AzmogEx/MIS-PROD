import { getCMS } from '@/cms/payload'
import { readBriefFile } from '@/cms/brief-files'
import { SubmissionError } from '@/cms/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" }
export async function GET(request: Request, context: { params: Promise<{ briefId: string; field: string }> }) {
  try {
    const cms = await getCMS(), { user } = await cms.auth({ headers: request.headers }), { briefId, field } = await context.params
    const file = await readBriefFile(cms, user, briefId, field)
    return new Response(new Uint8Array(file.bytes), { headers: { ...headers, 'Content-Type': file.mimeType, 'Content-Length': String(file.bytes.length), 'Content-Disposition': `attachment; filename="piece-jointe"; filename*=UTF-8''${encodeURIComponent(file.filename)}` } })
  } catch (error) { return Response.json({ error: error instanceof SubmissionError ? error.message : 'Pièce jointe introuvable.' }, { status: error instanceof SubmissionError ? error.status : 404, headers }) }
}
