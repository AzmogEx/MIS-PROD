import { notFound, permanentRedirect } from 'next/navigation'
import { getCMS } from './payload'
import { readPage, readSiteContent } from './read'
import { getPublishedForm } from './operations'
import { PageRenderer } from '@/components/cms/page-renderer'
import { SiteContentProvider } from '@/components/cms/content-context'
import type { PublicForm } from './form-schema'
import type { PageBlock } from './page-types'

export async function renderPage(path: string, locale: 'fr' | 'en' = 'fr') {
  const [page, content, cms] = await Promise.all([readPage(path, locale), readSiteContent(false, locale), getCMS()])
  if (!page) {
    const redirects = await cms.find({ collection: 'redirects', where: { from: { equals: path } }, depth: 0, limit: 1, overrideAccess: true })
    if (redirects.docs[0]) permanentRedirect(String(redirects.docs[0].to))
    notFound()
  }
  const forms: Record<string, PublicForm> = {}
  async function collectForms(blocks:PageBlock[]) { for (const block of blocks) {
    if (block.blockType === 'contact') { const key = block.formSlug || 'brief-projet'; const form = await getPublishedForm(cms, key, locale); if (form) forms[key] = form }
    if (block.section && typeof block.section === 'object') await collectForms(block.section.layout || [])
  } }
  await collectForms(page.layout || [])
  const base=content.site.url.replace(/\/$/,'')
  const structured={'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':`${base}/#studio`,name:content.site.name,url:base,email:content.site.email,telephone:content.site.phoneE164},
    {'@type':'WebPage',name:page.title,url:base+(locale==='en'?'/en':'')+(path==='/'&&locale==='en'?'':path),inLanguage:locale,publisher:{'@id':`${base}/#studio`}},
  ]}
  return <SiteContentProvider content={content}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replaceAll('<','\\u003c')}}/><main className="relative"><PageRenderer page={page} forms={forms} /></main></SiteContentProvider>
}
