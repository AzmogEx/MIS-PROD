'use client'

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {useSiteContent} from './content-context'
import Link from 'next/link'
import { createAnalyticsRuntime, progressMarkers, classifyAcquisition, type BrowserEvent } from '@/cms/analytics-events'

type Track = (event: BrowserEvent, details?: { key?: string; reference?: string; step?: number; once?: string }) => boolean
const AnalyticsContext = createContext<{ track: Track }>({ track: () => false })
export const useAnalytics = () => useContext(AnalyticsContext)

export function BrowserAnalytics({ children, pages, references }: { children: ReactNode; pages: Record<string, string>; references: Record<string, string> }) {
  const pathname = usePathname()
  const {ui}=useSiteContent()
  const [runtime] = useState(() => createAnalyticsRuntime({
    enabled: true, randomID: () => crypto.randomUUID(),
    device: () => window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    acquisition:()=>classifyAcquisition(document.referrer,location.origin),
    send: (payload, signal) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'same-origin' }),
  }))
  const consent = useSyncExternalStore(runtime.subscribe, runtime.snapshot, () => 'pending' as const)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const value = useMemo(() => ({ track: ((event, details = {}) => runtime.track(event, { ...details, key: details.key ?? (details.reference ? references[details.reference] : undefined) })) as Track }), [runtime, references])
  useEffect(() => {
    const path = (pathname || '/').replace(/^\/en(?=\/|$)/, '') || '/'
    const key = pages[path]
    runtime.navigate(key)
    if (key) runtime.track('page_view', { once: 'current-navigation' })
  }, [pathname, pages, consent, runtime])
  useEffect(() => () => runtime.abort(), [runtime])
  useEffect(() => {
    if (consent !== 'accepted') return
    const videos = new WeakMap<HTMLVideoElement, { started: boolean; markers: Set<number> }>()
    const play = (event: Event) => {
      const video = event.target
      if (!(video instanceof HTMLVideoElement) || !video.dataset.misAnalytics) return
      const previous = videos.get(video)
      if (previous?.started) return
      const started = runtime.track(video.dataset.misAnalytics === 'auto' ? 'video_play_auto' : 'video_play_manual')
      videos.set(video, { started, markers: new Set() })
    }
    const progress = (event: Event) => {
      const video = event.target
      if (!(video instanceof HTMLVideoElement) || (video.paused && event.type !== 'ended')) return
      const state = videos.get(video)
      if (!state?.started || video.seeking) return
      for (const marker of progressMarkers(event.type === 'ended' ? video.duration : video.currentTime, video.duration, state.markers)) {
        state.markers.add(marker)
        runtime.track('video_progress', { step: marker })
      }
    }
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (/^(mailto:|tel:)/.test(href) || /^\/(?:en\/)?contact(?:[?#]|$)/.test(href)) runtime.track('contact_click')
    }
    const error = (event: Event) => { if (event.target instanceof HTMLVideoElement && event.target.dataset.misAnalytics) runtime.track('technical_error', { once: 'media-load' }) }
    document.addEventListener('play', play, true); document.addEventListener('timeupdate', progress, true); document.addEventListener('ended', progress, true); document.addEventListener('click', click, true); document.addEventListener('error', error, true)
    return () => { document.removeEventListener('play', play, true); document.removeEventListener('timeupdate', progress, true); document.removeEventListener('ended', progress, true); document.removeEventListener('click', click, true); document.removeEventListener('error', error, true) }
  }, [consent, runtime])
  const choose = (accepted: boolean) => { runtime.choose(accepted ? 'accepted' : 'refused'); setSettingsOpen(false) }
  const english = /^\/en(?:\/|$)/.test(pathname || '')
  return <AnalyticsContext.Provider value={value}>
    {children}
    <aside aria-label={ui.analyticsLabel} className="border-t border-border bg-background-elevated px-5 py-5 text-sm text-foreground">
      {settingsOpen ? <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl"><h2 className="font-medium">{ui.analyticsTitle}</h2><p className="mt-2 leading-relaxed text-foreground-muted">{ui.analyticsDescription} <Link className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold" href={english ? '/en/confidentialite' : '/confidentialite'}>{ui.privacyLabel}</Link></p></div>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => choose(false)} className="min-h-11 rounded border border-border-strong px-5 py-2 focus-visible:outline-2 focus-visible:outline-gold">{ui.analyticsDecline}</button><button type="button" onClick={() => choose(true)} className="min-h-11 rounded border border-border-strong px-5 py-2 focus-visible:outline-2 focus-visible:outline-gold">{ui.analyticsAllow}</button></div>
      </div> : <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><span role="status">{consent === 'accepted' ? ui.analyticsAccepted : ui.analyticsRefused}</span><button type="button" onClick={() => { runtime.choose('refused'); setSettingsOpen(true) }} className="min-h-11 rounded border border-border-strong px-4 py-2 focus-visible:outline-2 focus-visible:outline-gold">{consent === 'accepted' ? ui.analyticsWithdraw : ui.analyticsChange}</button></div>}
    </aside>
  </AnalyticsContext.Provider>
}
