import { getCMS } from '@/cms/payload'
import { getAuthorizedProject, isClientStaff, isUnexpired, relationID, requireSameOrigin, type Relation } from '@/cms/client-services'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  const payload = await getCMS()
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Connectez-vous pour accéder à vos projets.' }, { status: 401, headers: noStore })
  const options = { user, overrideAccess: false, depth: 0, pagination: false } as const
  const [projects, deliveries, comments, approvals, portfolios] = await Promise.all([
    payload.find({ collection: 'projects', ...options, sort: '-updatedAt' }),
    payload.find({ collection: 'deliverables', ...options, sort: '-createdAt' }),
    payload.find({ collection: 'video-comments', ...options, sort: 'recordedAt' }),
    payload.find({ collection: 'approvals', ...options, sort: '-recordedAt' }),
    payload.find({ collection: 'commercial-portfolios', ...options, sort: '-updatedAt' }),
  ])
  const files = new Map<string, { id: string | number; mimeType?: string | null; title?: string; available: boolean }>()
  const documents = await payload.find({ collection: 'private-files', where: { and: [{ project: { in: projects.docs.map((project) => project.id) } }, ...(isClientStaff(user) ? [] : [{ clientVisible: { equals: true } }])] }, depth: 0, pagination: false, overrideAccess: true })
  for (const item of deliveries.docs) {
    const fileID = relationID(item.file as Relation)
    if (fileID === undefined) continue
    try {
      await getAuthorizedProject(payload, item.project as Relation, user)
      const file = await payload.findByID({ collection: 'private-files', id: fileID, depth: 0, overrideAccess: true })
      files.set(String(fileID), { id: fileID, mimeType: file.mimeType as string | undefined, title: file.title as string, available: !file.revoked && isUnexpired(file.expiresAt as string | undefined) })
    } catch { /* A revoked or removed association must not reveal its metadata. */ }
  }
  const safePortfolios = []
  for (const portfolio of portfolios.docs) {
    if (portfolio.revoked || !isUnexpired(portfolio.expiresAt as string | undefined)) continue
    const items = []
    for (const item of (portfolio.items || []) as Array<{ title: string; context?: string; media: Relation; rightsConfirmed: boolean }>) {
      if (!item.rightsConfirmed) continue
      try {
        const media = await payload.findByID({ collection: 'media', id: relationID(item.media)!, depth: 0, overrideAccess: false, user })
        if (media.visibility !== 'public' || !isUnexpired(media.rightsUntil as string | undefined)) continue
        items.push({ title: item.title, context: item.context, url: media.url, mimeType: media.mimeType, alt: media.alt })
      } catch { /* Restricted or expired media is omitted. */ }
    }
    safePortfolios.push({ id: portfolio.id, title: portfolio.title, introduction: portfolio.introduction, expiresAt: portfolio.expiresAt, items })
  }
  return Response.json({ user: { id: user.id, email: user.email, staff: isClientStaff(user) }, projects: projects.docs, deliveries: deliveries.docs, comments: comments.docs, approvals: approvals.docs, files: [...files.values()], documents: documents.docs.map((file) => ({ id: file.id, title: file.title, project: relationID(file.project as Relation), kind: file.kind, available: !file.revoked && isUnexpired(file.expiresAt as string | undefined), mimeType: file.mimeType })), portfolios: safePortfolios }, { headers: noStore })
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    if (Number(request.headers.get('content-length') || 0) > 20000) return Response.json({ error: 'Demande trop longue.' }, { status: 413, headers: noStore })
    const raw = await request.text()
    if (raw.length > 20000) return Response.json({ error: 'Demande trop longue.' }, { status: 413, headers: noStore })
    const data = JSON.parse(raw) as Record<string, unknown>
    const payload = await getCMS()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return Response.json({ error: 'Connexion requise.' }, { status: 401, headers: noStore })
    if (!['comment', 'approve'].includes(String(data.action))) return Response.json({ error: 'Action inconnue.' }, { status: 400, headers: noStore })
    const deliverable = await payload.findByID({ collection: 'deliverables', id: String(data.deliverable), depth: 0, overrideAccess: false, user })
    await getAuthorizedProject(payload, deliverable.project as Relation, user)
    const common = { project: relationID(deliverable.project as Relation), deliverable: deliverable.id }
    if (data.action === 'comment') {
      const body = typeof data.body === 'string' ? data.body.trim() : ''
      if (!body || body.length > 5000) return Response.json({ error: 'Le commentaire doit contenir entre 1 et 5 000 caractères.' }, { status: 400, headers: noStore })
      await payload.create({ collection: 'video-comments', data: { ...common, body, timecode: data.timecode }, user, overrideAccess: false })
    } else {
      if (!['accepted', 'changes_requested'].includes(String(data.decision))) return Response.json({ error: 'Décision invalide.' }, { status: 400, headers: noStore })
      const key = `${deliverable.id}:${user.id}:${data.decision}`
      const existing = await payload.find({ collection: 'approvals', where: { deduplicationKey: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
      if (!existing.totalDocs) {
        await payload.create({ collection: 'approvals', data: { ...common, decision: data.decision, note: typeof data.note === 'string' ? data.note.slice(0, 5000) : '' }, user, overrideAccess: false })
      }
    }
    return Response.json({ ok: true }, { headers: noStore })
  } catch (error) {
    const message = error instanceof Error && /repère vidéo|version ne correspond|Origine/.test(error.message) ? error.message : 'Cette action ne peut pas être enregistrée. Vérifiez vos droits et la version sélectionnée.'
    return Response.json({ error: message }, { status: 400, headers: noStore })
  }
}
