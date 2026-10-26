import { getCMS } from '@/cms/payload'
import { aiAvailability, aiTasks, generateAISuggestion, isAIStaff, type AIConfiguration, type AITask } from '@/cms/ai'
import { requireSameOrigin } from '@/cms/client-services'
import { transcriptionAvailability } from '@/cms/transcription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const payload = await getCMS()
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || !isAIStaff(user)) return Response.json({ error: 'Accès réservé à l’équipe MIS.' }, { status: 403 })
  const settings = await payload.findGlobal({ slug: 'ai-settings', overrideAccess: true }) as unknown as AIConfiguration
  const requests = await payload.find({ collection: 'ai-requests', where: { requestedBy: { equals: user.id } }, sort: '-createdAt', limit: 10, depth: 0, user, overrideAccess: false })
  return Response.json({ ...aiAvailability(settings), provider: 'Ollama local', model: settings.model, maxInputCharacters: settings.maxInputCharacters, tasks: aiTasks, requests: requests.docs, transcription: transcriptionAvailability(settings), externalProvider: { available: false, reason: 'Les fournisseurs externes ne sont pas implémentés dans cette livraison.' } }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const payload = await getCMS()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user || !isAIStaff(user)) return Response.json({ error: 'Accès réservé à l’équipe MIS.' }, { status: 403 })
    const raw = await request.text()
    if (raw.length > 35000) return Response.json({ error: 'Texte trop long.' }, { status: 413 })
    const body = JSON.parse(raw) as { task: AITask; text: string; language?: string; requestKey: string }
    const result = await generateAISuggestion(payload, user, body)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message.slice(0, 300) : 'L’assistance est indisponible.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) }
}
