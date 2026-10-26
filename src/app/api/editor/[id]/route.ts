import { headers } from 'next/headers'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { saveEditor } from '@/cms/editor-service'
import { requireSameOrigin } from '@/cms/client-services'
import { readLimitedJSON } from '@/cms/operations'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request)
    if (Number(request.headers.get('content-length') || 0) > 2_000_000) return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 })
    const cms = await getCMS(); const { user } = await cms.auth({ headers: await headers() })
    if (!user || !hasRole(user, ['owner', 'admin', 'editor'])) return Response.json({ error: 'Accès interdit.' }, { status: 403 })
    const body = await readLimitedJSON(request, 2_000_000) as Parameters<typeof saveEditor>[3]
    const result = await saveEditor(cms, user, Number((await params).id), body)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { const message = error instanceof Error ? error.message : 'Enregistrement impossible.'; return Response.json({ error: message }, { status: message.startsWith('CONFLICT:') ? 409 : 400 }) }
}
