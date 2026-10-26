import config from '@/payload.config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'
import Link from 'next/link'
import { getCMS } from '@/cms/payload'
import { redirect } from 'next/navigation'

type Args = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[]>> }
export const generateMetadata = ({ params, searchParams }: Args) => generatePageMetadata({ config, params, searchParams })
export default async function Page({ params, searchParams }: Args) {
  if((await params).segments?.join('/')==='create-first-user'){
    const cms=await getCMS()
    if((await cms.count({collection:'users'})).totalDocs)redirect('/admin/login')
    return <main style={{maxWidth:640,margin:'15vh auto',padding:32}}><h1>Initialiser l’espace MIS</h1><p>Le premier compte propriétaire doit être créé par la personne responsable de l’installation, depuis l’environnement protégé du serveur.</p><p>La création publique de comptes est désactivée. La procédure « Premier propriétaire » se trouve dans le guide d’exploitation livré avec le projet.</p><Link href="/admin/login">Connexion après initialisation</Link></main>
  }
  return RootPage({ config, params, searchParams, importMap })
}
