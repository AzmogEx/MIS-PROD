'use client'

import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { HeroSection } from '@/components/site/hero-section'
import { ManifestoSection } from '@/components/site/manifesto-section'
import { StatsSection } from '@/components/site/stats-section'
import { UniversesSection } from '@/components/site/universes-section'
import { PortfolioSection } from '@/components/site/portfolio-section'
import { ClientsSection } from '@/components/site/clients-section'
import { CtaSection } from '@/components/site/cta-section'
import { PricingSection } from '@/components/site/pricing-section'
import { UniversePageLayout } from '@/components/site/universe-page-layout'
import { LegalPageLayout } from '@/components/site/legal-page-layout'
import { useSiteContent, useLocalizedHref } from './content-context'
import { HistoricalGridContext } from './historical-grid'
import { DynamicContactForm } from './dynamic-contact-form'
import type { PublicForm } from '@/cms/form-schema'
import type { MediaRecord, PageBlock, PageRecord } from '@/cms/page-types'

const safeHref = (url?: string) => url && /^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/.test(url) ? url : undefined
function Media({ media }: { media?: MediaRecord | number | null }) {
  const {ui}=useSiteContent()
  if (!media || typeof media !== 'object' || !media.url) return null
  // Expiry and file visibility are enforced by the server on every file request.
  if (media.visibility === 'restricted') return null
  if (media.mimeType?.startsWith('video/')) return <div><video data-mis-analytics="manual" controls preload="none" poster={media.poster?.url || undefined} className="cms-block-media"><source src={media.url} type={media.mimeType} />{media.captions?.url && <track default kind="captions" src={media.captions.url} srcLang={media.captions.language||media.language||'fr'} />}</video>{media.transcript&&<details><summary>Transcription</summary><p className="cms-body" lang={media.language||'fr'}>{media.transcript}</p></details>}</div>
  if (media.mimeType?.startsWith('image/')) return <Image unoptimized src={media.url} alt={media.alt || ''} width={media.width || 1200} height={media.height || 800} loading="lazy" className="cms-block-media" />
  return <a href={media.url} className="cms-link">{media.alt || ui.downloadLabel}</a>
}
function Editorial({ block, headingLevel = 2, lead = false }: { block: PageBlock; headingLevel?: 1 | 2; lead?: boolean }) {
  const localize = useLocalizedHref()
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return <div className="cms-editorial">{block.eyebrow && <p className="cms-kicker">{block.eyebrow}</p>}{block.title && <Heading style={{ paddingTop: lead ? 40 : 0 }}>{block.title}</Heading>}{block.body && <p className="cms-body">{block.body}</p>}<Media media={block.media} />{block.linkLabel && safeHref(block.link) && <a className="cms-link" href={localize(safeHref(block.link)!)}>{block.linkLabel} <span aria-hidden>↗</span></a>}</div>
}
export function PageRenderer({ page, forms = {} }: { page: Pick<PageRecord, 'layout'> & Partial<Pick<PageRecord, 'title'>>; forms?: Record<string, PublicForm> }) {
  const content = useSiteContent()
  // Resolve one occurrence across the complete visible composition, including
  // synchronized sections. IDs cannot identify occurrences when a block repeats.
  const findHeading = (blocks: PageBlock[], prefix = ''): string | undefined => {
    for (const [index, block] of blocks.entries()) {
      if (block.hidden) continue
      const key = `${prefix}/${index}`
      if (block.blockType === 'shared' && block.section && typeof block.section === 'object') {
        const nested = findHeading(block.section.layout || [], key)
        if (nested) return nested
      }
      if (block.blockType === 'hero' || (block.blockType === 'universe' && content.universes.some(universe => universe.slug === block.universeSlug)) || (['editorial', 'legal', 'columns', 'steps', 'gallery', 'faq'].includes(block.blockType) && block.title?.trim())) return key
    }
  }
  const mainHeading = findHeading(page.layout || [])
  function interpolate(text: string) {
    return text.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (_, key: string) => {
      let value: unknown = content
      for (const part of key.split('.')) value = value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined
      return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    })
  }
  const render = (block: PageBlock, index: number, key: string): ReactNode => {
    const headingLevel = key === mainHeading ? 1 : 2
    const Heading = headingLevel === 1 ? 'h1' : 'h2'
    switch (block.blockType) {
      case 'hero': return <HeroSection headingLevel={headingLevel} />
      case 'manifesto': return <ManifestoSection />
      case 'stats': return <StatsSection />
      case 'universes': return <UniversesSection />
      case 'portfolio': return <PortfolioSection />
      case 'clients': return <ClientsSection />
      case 'cta': return <CtaSection />
      case 'pricing': return <PricingSection />
      case 'universe': { const universe = content.universes.find(u => u.slug === block.universeSlug); return universe ? <UniversePageLayout universe={universe} headingLevel={headingLevel} afterFormulas={universe.slug === 'particuliers' ? <PricingSection /> : undefined} /> : null }
      case 'contact': return <section className="cms-composed"><div className="cms-reading">{forms[block.formSlug || 'brief-projet'] ? <DynamicContactForm form={forms[block.formSlug || 'brief-projet']} /> : <p role="status">{content.ui.formUnavailable.replaceAll('{{email}}',content.site.email)}</p>}</div></section>
      case 'editorial': return <section className="cms-composed"><Editorial block={block} headingLevel={headingLevel} lead={index === 0} /></section>
      case 'columns': case 'steps': return <section className="cms-composed"><Heading style={{ paddingTop: 0 }}>{block.title}</Heading><div className="cms-columns">{block.items?.map((item, i) => <Editorial block={item} key={item.id || i} />)}</div></section>
      case 'gallery': return <section className="cms-composed"><Heading style={{ paddingTop: 0 }}>{block.title}</Heading><div className="cms-columns">{block.items?.map((item, i) => <figure key={item.id || i}><Media media={item.media} /><figcaption>{item.caption}</figcaption></figure>)}</div></section>
      case 'faq': return <section className="cms-composed"><Heading style={{ paddingTop: 0 }}>{block.title}</Heading>{block.items?.map((item, i) => <details key={item.id || i}><summary>{item.question}</summary><p className="cms-body">{item.answer}</p></details>)}</section>
      case 'shared': return block.section && typeof block.section === 'object' ? renderBlocks(block.section.layout || [], key) : null
      case 'legal': return <LegalPageLayout headingLevel={headingLevel} number={block.number || ''} eyebrow={content.ui.legalEyebrow} title={block.title || ''} lastUpdate={block.lastUpdate || ''}>{block.sections?.map((item, i) => item.kind === 'heading' ? <h2 key={i}>{interpolate(item.text)}</h2> : item.kind === 'subheading' ? <h3 key={i}>{interpolate(item.text)}</h3> : <p key={i} style={{ whiteSpace: 'pre-line' }}>{interpolate(item.text)}</p>)}</LegalPageLayout>
      default: return null
    }
  }
  const renderBlocks = (blocks: PageBlock[], prefix = ''): ReactNode => blocks.map((block, index) => {
    if (block.hidden) return null
    const appearance = block.appearance || {}
    const columns=Math.min(4,Math.max(1,appearance.columns||3))
    const hex=(value?:string)=>value&&/^#[0-9a-f]{6}$/i.test(value)?value:undefined
    const fonts={sans:'var(--font-sans-display),sans-serif',serif:'var(--font-serif-display),serif',mono:'var(--font-mono),monospace'}
    const style = { '--cms-columns':columns,'--cms-tablet-columns':Math.min(4,Math.max(1,appearance.tabletColumns||columns)),'--cms-mobile-columns':Math.min(2,Math.max(1,appearance.mobileColumns||1)),'--cms-custom-bg':hex(appearance.customBackground),'--cms-custom-color':hex(appearance.customColor),'--cms-typeface':appearance.typeface&&appearance.typeface!=='inherit'?fonts[appearance.typeface]:undefined,'--cms-animation-duration':`${Math.max(100,Math.min(1500,appearance.animationDuration||500))}ms`,borderRadius:Math.max(0,Math.min(64,appearance.radius||0)),textAlign:appearance.align||undefined } as CSSProperties
    return <div key={block.id || index} data-cms-block={index} data-animation={appearance.animation||'inherit'} data-typeface={appearance.typeface||'inherit'} id={block.anchor || undefined} className={`cms-block cms-bg-${appearance.background || 'inherit'} cms-color-${appearance.color || 'inherit'} cms-width-${appearance.width || 'wide'} cms-space-${appearance.spacing || 'inherit'} ${appearance.border ? 'cms-border' : ''} ${hex(appearance.customBackground)?'cms-custom-bg':''} ${hex(appearance.customColor)?'cms-custom-color':''}`} style={style}><HistoricalGridContext.Provider value={appearance.gridLayout === 'uniform' ? 'uniform' : 'original'}>{render(block, index, `${prefix}/${index}`)}</HistoricalGridContext.Provider></div>
  })
  return <>{!mainHeading && <h1 className="sr-only">{page.title || content.site.name}</h1>}{renderBlocks(page.layout || [])}</>
}
