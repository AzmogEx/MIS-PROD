import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { readSiteContent } from '@/cms/read'
import { getPublishedForm } from '@/cms/operations'
import { SiteContentProvider } from '@/components/cms/content-context'
import { PageRenderer } from '@/components/cms/page-renderer'
import { PreviewBridge } from '@/components/cms/preview-bridge'
import { Navbar } from '@/components/site/navbar'
import { Footer } from '@/components/site/footer'
import { GlobalAppearance } from '@/components/cms/global-appearance'
import type { PageBlock, PageRecord } from '@/cms/page-types'
import type { PublicForm } from '@/cms/form-schema'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }
export default async function Preview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  const locale = (await searchParams).locale === 'en' ? 'en' : 'fr'
  const cms = await getCMS(); const { user } = await cms.auth({ headers: await headers() })
  if (!user || !hasRole(user, ['owner', 'admin', 'editor'])) notFound()
  const page = await cms.findByID({ collection: 'pages', id: (await params).id, locale, draft: true, depth: 3, overrideAccess: false, user }) as unknown as PageRecord
  const content = await readSiteContent(true, locale)
  const forms: Record<string, PublicForm> = {}
  async function collectForms(blocks:PageBlock[]) { for(const block of blocks) { if(block.blockType==='contact'){const key=block.formSlug||'brief-projet';const form=await getPublishedForm(cms,key,locale);if(form)forms[key]=form}if(block.section&&typeof block.section==='object')await collectForms(block.section.layout||[]) } }
  await collectForms(page.layout || [])
  return <SiteContentProvider content={content} locale={locale}><GlobalAppearance content={content}><Navbar /><main lang={locale}><PageRenderer page={page} forms={forms} /></main><Footer /><PreviewBridge /></GlobalAppearance></SiteContentProvider>
}
