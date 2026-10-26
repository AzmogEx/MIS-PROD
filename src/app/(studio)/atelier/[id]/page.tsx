import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { fromPayloadContent } from '@/cms/content-fields'
import { VisualEditor } from '@/components/cms/visual-editor'
import type { PageRecord } from '@/cms/page-types'
export const dynamic = 'force-dynamic'
export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  const locale = (await searchParams).locale === 'en' ? 'en' : 'fr'
  const cms = await getCMS(); const { user } = await cms.auth({ headers: await headers() })
  if (!user) redirect('/admin/login')
  if (!hasRole(user, ['owner', 'admin', 'editor'])) notFound()
  const page = await cms.findByID({ collection: 'pages', id: (await params).id, locale, draft: true, depth: 2, overrideAccess: false, user }) as unknown as PageRecord
  const content = await cms.findGlobal({ slug: 'site-content', locale, draft: true, depth: 0, overrideAccess: false, user })
  const media = await cms.find({ collection: 'media', locale, limit: 100, overrideAccess: false, user })
  return <VisualEditor key={locale} locale={locale} initialPage={page} initialContent={fromPayloadContent(content)} contentUpdatedAt={content.updatedAt} media={media.docs.map(m => ({ id: Number(m.id), label: String(m.alt || m.filename) }))} />
}
