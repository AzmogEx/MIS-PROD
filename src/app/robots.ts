import type { MetadataRoute } from 'next'
import { readSiteContent } from '@/cms/read'
export const dynamic = 'force-dynamic'
export default async function robots(): Promise<MetadataRoute.Robots> {
 if(process.env.CMS_DEPLOYMENT_ENVIRONMENT==='preproduction')return {rules:[{userAgent:'*',disallow:'/'}]};
 const {site}=await readSiteContent();return {rules:[{userAgent:'*',allow:'/',disallow:['/api/','/admin/','/apercu/','/atelier/','/gestion','/medias','/espace-client','/assistance','/securite','/connexion']}],sitemap:site.url+'/sitemap.xml',host:site.url};
}
