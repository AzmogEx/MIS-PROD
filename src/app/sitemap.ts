import type { MetadataRoute } from 'next'
import { getCMS } from '@/cms/payload'
import { readSiteContent } from '@/cms/read'
import type { PaginatedDocs } from 'payload'
import type { PageRecord } from '@/cms/page-types'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if(process.env.CMS_DEPLOYMENT_ENVIRONMENT==='preproduction')return [];
  const cms=await getCMS();const {site}=await readSiteContent();
  const shared=await cms.findGlobal({slug:'site-content',locale:'en',depth:0,overrideAccess:true,select:{translationState:true,sourceRevision:true,reviewedSourceRevision:true}})
  const entries:MetadataRoute.Sitemap=[]
  for(const locale of ['fr','en'] as const){
    if(locale==='en'&&shared.translationState!=='reviewed')continue
    let next:number|null=1
    while(next){
      const result:PaginatedDocs<PageRecord>=await cms.find({collection:'pages',where:{and:[{_status:{equals:'published'}},{'seo.noindex':{not_equals:true}}]},draft:false,locale,depth:0,limit:500,page:next,overrideAccess:false}) as unknown as PaginatedDocs<PageRecord>
      for(const page of result.docs){
        if(locale==='en'&&page.translationState!=='reviewed')continue
        entries.push({url:site.url+(locale==='en'?'/en':'')+(page.path==='/'&&locale==='en'?'':String(page.path)),lastModified:new Date(String(page.updatedAt)),changeFrequency:'monthly',priority:page.path==='/'?1:0.7})
      }
      next=result.nextPage??null
    }
  }
  return entries
}
