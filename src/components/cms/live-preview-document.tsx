'use client'

import { useEffect, useState } from 'react'
import { SiteContentProvider } from '@/components/cms/content-context'
import { PageRenderer } from '@/components/cms/page-renderer'
import { PreviewBridge } from '@/components/cms/preview-bridge'
import { Navbar } from '@/components/site/navbar'
import { Footer } from '@/components/site/footer'
import { GlobalAppearance } from '@/components/cms/global-appearance'
import type { PublicForm } from '@/cms/form-schema'
import type { MediaRecord, PageBlock, PageRecord } from '@/cms/page-types'
import type { SiteContent } from '@/cms/seed-content'

type PreviewMedia = MediaRecord & { id: number; label?: string }

function resolveMedia(page: PageRecord, media: PreviewMedia[]): PageRecord {
  const byID = new Map(media.filter(item => item.visibility !== 'restricted' && (!item.rightsUntil || Date.parse(item.rightsUntil) > Date.now())).map(item => [item.id, item]))
  const visitBlock = (block: PageBlock): PageBlock => ({
    ...block,
    ...(typeof block.media === 'number' ? { media: byID.get(block.media) || null } : {}),
    ...(block.items ? { items: block.items.map(visitBlock) } : {}),
    ...(block.section && typeof block.section === 'object' ? { section: { ...block.section, layout: visit(block.section.layout || []) } } : {}),
  })
  const visit = (blocks: PageBlock[]): PageBlock[] => blocks.map(visitBlock)
  return { ...page, layout: visit(page.layout || []) }
}

export function LivePreviewDocument({ initialPage, initialContent, forms, locale }: {
  initialPage: PageRecord
  initialContent: SiteContent
  forms: Record<string, PublicForm>
  locale: 'fr' | 'en'
}) {
  const [page, setPage] = useState(initialPage)
  const [content, setContent] = useState(initialContent)
  const [media, setMedia] = useState<PreviewMedia[]>([])

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'mis:preview-update') return
      if (String(event.data.page?.id) !== String(initialPage.id) || !Array.isArray(event.data.page?.layout) || !event.data.content || typeof event.data.content !== 'object') return
      if (Array.isArray(event.data.media)) setMedia(event.data.media)
      setPage(event.data.page as PageRecord)
      setContent(event.data.content as SiteContent)
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'mis:preview-ready', pageID: initialPage.id }, window.location.origin)
    return () => window.removeEventListener('message', receive)
  }, [initialPage.id])

  const previewPage = resolveMedia(page, media)
  return <SiteContentProvider content={content} locale={locale}>
    <GlobalAppearance content={content}>
      <Navbar />
      <main lang={locale}><PageRenderer page={previewPage} forms={forms} /></main>
      <Footer />
      <PreviewBridge />
    </GlobalAppearance>
  </SiteContentProvider>
}
