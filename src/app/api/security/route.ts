import { getCMS } from '@/cms/payload'
import { getSecurityState, manageMFA } from '@/cms/mfa'
import { requireSameOrigin } from '@/cms/client-services'
import { APIError } from 'payload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }

export async function GET(request: Request) {
  const payload = await getCMS()
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Connectez-vous pour gérer votre sécurité.' }, { status: 401, headers })
  return Response.json(await getSecurityState(payload, user.id, user._sid), { headers })
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const payload = await getCMS()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return Response.json({ error: 'Connectez-vous pour gérer votre sécurité.' }, { status: 401, headers })
    const raw = await request.text()
    if (raw.length > 5000) return Response.json({ error: 'Demande trop longue.' }, { status: 413, headers })
    const body = JSON.parse(raw) as { action: string; password?: string; code?: string; sessionID?: string }
    const result = await manageMFA(payload, user.id, body, user._sid)
    return Response.json(result, { headers })
  } catch (error) { return Response.json({ error: error instanceof APIError ? error.message.slice(0, 280) : 'Opération de sécurité impossible. Réessayez ou contactez le propriétaire.' }, { status: 400, headers }) }
}
