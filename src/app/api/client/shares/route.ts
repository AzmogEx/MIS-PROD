import { getCMS } from '@/cms/payload'
import { getAuthorizedProject, isClientStaff, isUnexpired, newShareToken, relationID, requireSameOrigin, type Relation } from '@/cms/client-services'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const payload = await getCMS()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user || !isClientStaff(user)) return Response.json({ error: 'Accès réservé à l’équipe MIS.' }, { status: 403 })
    const text = await request.text()
    if (text.length > 2000) return Response.json({ error: 'Demande invalide.' }, { status: 400 })
    const body = JSON.parse(text) as { file: string | number; hours?: number }
    const file = await payload.findByID({ collection: 'private-files', id: body.file, depth: 0, overrideAccess: true })
    const project = await getAuthorizedProject(payload, file.project as Relation, user)
    if (project.archived || file.revoked || !isUnexpired(file.expiresAt as string | undefined)) return Response.json({ error: 'Le fichier ou son projet ne permet plus le partage.' }, { status: 400 })
    const hours = body.hours ?? 24
    if (!Number.isFinite(hours) || hours <= 0 || hours > 168) return Response.json({ error: 'La durée doit être comprise entre 1 et 168 heures.' }, { status: 400 })
    const expiresAt = new Date(Math.min(Date.now() + hours * 3600000, file.expiresAt ? Date.parse(file.expiresAt as string) : Infinity)).toISOString()
    const { token, hash } = newShareToken()
    const share = await payload.create({ collection: 'file-shares', data: { title: file.title, file: file.id, project: relationID(file.project as Relation), tokenHash: hash, expiresAt, revoked: false, createdBy: user.id }, user, overrideAccess: true })
    return Response.json({ id: share.id, url: `${new URL(request.url).origin}/api/client/shared/${token}`, expiresAt }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'Impossible de créer le lien.' }, { status: 400 }) }
}
