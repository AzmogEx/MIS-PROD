import { headers } from 'next/headers'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { restoreRelease } from '@/cms/editor-service'
import { requireSameOrigin } from '@/cms/client-services'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request)
    const cms = await getCMS(); const { user } = await cms.auth({ headers: await headers() })
    if (!user || !hasRole(user, ['owner','admin','editor'])) return Response.json({ error:'Accès interdit.' },{ status:403 })
    const result=await restoreRelease(cms,user,(await params).id)
    const sectionNote=result.restoredSections.length ? ` ${result.restoredSections.length} section(s) synchronisée(s) ont aussi été restaurées en brouillon : ${result.restoredSections.map(section=>section.title).join(', ')}. Relisez et publiez ces sections explicitement avant la page pour diffuser leur version historique ; cela concerne toutes les pages qui les utilisent. Publier la page seule conserve les versions actuellement publiques de ces sections.` : ''
    return Response.json({id:result.page.id,restoredSections:result.restoredSections,message:`Composition et contenus globaux restaurés en brouillon ; le site public reste inchangé.${sectionNote} Vérifiez l’aperçu. Publier les contenus globaux concerne aussi les autres pages.`},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){const message=error instanceof Error?error.message:'Restauration impossible.';return Response.json({error:message},{status:message.startsWith('CONFLICT:')?409:400,headers:{'Cache-Control':'private, no-store'}})}
}
