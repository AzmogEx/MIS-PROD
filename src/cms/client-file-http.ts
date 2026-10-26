import type { Payload } from 'payload'
import { getAuthorizedPrivateFile, isUnexpired, relationID, servePrivateFile, tokenDigest, type Relation } from './client-services'

/** The production routes and isolated HTTP tests execute the same authorization. */
export function clientFileHandlers(getCMS: () => Promise<Payload>) {
  return {
    file: async (request: Request, id: string) => {
      try {
        const payload = await getCMS(), { user } = await payload.auth({ headers: request.headers })
        if (!user) return new Response('Connexion requise.', { status: 401, headers: { 'Cache-Control': 'no-store' } })
        return await servePrivateFile(request, await getAuthorizedPrivateFile(payload, id, user))
      } catch { return new Response('Fichier indisponible.', { status: 404, headers: { 'Cache-Control': 'no-store' } }) }
    },
    shared: async (request: Request, token: string) => {
      try {
        if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new Error('Lien invalide.')
        const payload = await getCMS()
        const matches = await payload.find({ collection: 'file-shares', where: { tokenHash: { equals: tokenDigest(token) } }, limit: 1, depth: 0, overrideAccess: true })
        const share = matches.docs[0]
        if (!share || share.revoked || !isUnexpired(share.expiresAt as string)) throw new Error('Lien expiré.')
        const [project, file] = await Promise.all([
          payload.findByID({ collection: 'projects', id: relationID(share.project as Relation)!, depth: 0, overrideAccess: true }),
          payload.findByID({ collection: 'private-files', id: relationID(share.file as Relation)!, depth: 0, overrideAccess: true }),
        ])
        if (project.archived || String(relationID(file.project as Relation)) !== String(project.id)) throw new Error('Accès retiré.')
        return await servePrivateFile(request, file)
      } catch { return new Response('Ce lien a expiré ou a été révoqué.', { status: 404, headers: { 'Cache-Control': 'no-store' } }) }
    },
  }
}
