import { cache } from 'react'
import { getCMS } from './payload'
import { fromPayloadContent } from './content-fields'
import type { PageRecord } from './page-types'
import type { Metadata } from 'next'
import { translatedNavigation } from './translation'
import { publicContent } from './public-content'

export const readSiteContent = cache(async (draft = false, locale: 'fr' | 'en' = 'fr') => {
  const cms = await getCMS()
  const raw = await cms.findGlobal({ slug: 'site-content', draft, locale, depth: 0, overrideAccess: true })
  const content = draft ? fromPayloadContent(raw) : publicContent(fromPayloadContent(raw))
  return locale === 'en' ? translatedNavigation(content) : content
})
export const readPage = cache(async (path: string, locale: 'fr' | 'en' = 'fr') => {
  const cms = await getCMS()
  const result = await cms.find({ collection: 'pages', where: { and: [{ path: { equals: path } }, { _status: { equals: 'published' } }] }, draft: false, depth: 3, locale, limit: 1, overrideAccess: false })
  return result.docs[0] as unknown as PageRecord | undefined
})
export async function pageMetadata(path: string, locale: 'fr' | 'en' = 'fr'): Promise<Metadata> {
  const page = await readPage(path, locale)
  if (!page) return { title: 'Page introuvable', robots: { index: false } }
  const cms=await getCMS()
  const shared=await cms.findGlobal({slug:'site-content',locale:'en',depth:0,overrideAccess:true,select:{translationState:true,sourceRevision:true,reviewedSourceRevision:true}})
  const englishPage=locale==='en'?page:await readPage(path,'en')
  const reviewed=englishPage?.translationState==='reviewed'&&shared.translationState==='reviewed'
  const translated = locale === 'en' && reviewed
  return { title: page.seo?.title || page.title, description: page.seo?.description,
    alternates: { canonical: translated ? `/en${path === '/' ? '' : path}` : path, languages:reviewed?{fr:path,en:`/en${path==='/'?'':path}`}:undefined },
    robots: { index: process.env.CMS_DEPLOYMENT_ENVIRONMENT !== 'preproduction' && !page.seo?.noindex && (locale === 'fr' || translated), follow: process.env.CMS_DEPLOYMENT_ENVIRONMENT !== 'preproduction' && !page.seo?.noindex },
    openGraph: { title: page.seo?.title || page.title, description: page.seo?.description, url: path, images: page.seo?.image?.url ? [page.seo.image.url] : undefined },
  }
}
