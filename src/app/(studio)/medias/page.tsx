import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { MediaLibrary } from '@/components/cms/media-library'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Médiathèque — MIS', robots: { index: false, follow: false } }

export default async function MediaLibraryPage() {
  const cms = await getCMS(); const { user } = await cms.auth({ headers: await headers() })
  if (!user) redirect('/admin/login?redirect=%2Fmedias')
  if (!hasRole(user, ['owner', 'admin', 'editor'])) return <main style={{ padding: 40 }}><h1>Médiathèque éditoriale</h1><p>Votre compte ne dispose pas des droits d’édition des médias publics. Les documents de vos projets restent disponibles dans l’espace client.</p><Link href="/espace-client">Ouvrir l’espace client</Link></main>
  return <MediaLibrary />
}
