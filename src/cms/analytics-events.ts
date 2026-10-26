export const browserEvents = ['page_view', 'project_view', 'video_play_manual', 'video_play_auto', 'video_progress', 'form_start', 'form_step', 'contact_click', 'technical_error'] as const
export type BrowserEvent = typeof browserEvents[number]
export type AnalyticsConsent = 'pending' | 'accepted' | 'refused'
export const acquisitionCategories=['direct','internal','search','social','referral','unknown'] as const
export type Acquisition=typeof acquisitionCategories[number]
/** Classify locally. No hostname, path, query string or campaign value is sent. */
export function classifyAcquisition(referrer:string,origin:string):Acquisition{
  if(!referrer)return 'direct'
  try{const url=new URL(referrer);if(!['https:','http:'].includes(url.protocol))return 'unknown';if(url.origin===origin)return 'internal';const host=url.hostname.toLowerCase();if(/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|qwant\.com)$/.test(host))return 'search';if(/(^|\.)(facebook\.com|instagram\.com|linkedin\.com|t\.co|x\.com|youtube\.com|tiktok\.com|pinterest\.com)$/.test(host))return 'social';return 'referral'}catch{return 'unknown'}
}
export type AnalyticsPayload = { event: BrowserEvent; eventId: string; consent: true; pageKey?: string; step?: number; device: 'mobile' | 'tablet' | 'desktop'; entry?:boolean; acquisition?:Acquisition }
export const isAnalyticsKey = (key: string) => /^(?:(?:page|form)-[1-9]\d*|(?:project|universe-item)-[a-f0-9]{24})$/.test(key)

/** No visitor identifier, cookies, durable storage, pre-consent queue or retries. */
export function createAnalyticsRuntime(options: {
  enabled: boolean
  send: (payload: AnalyticsPayload, signal: AbortSignal) => Promise<unknown>
  randomID: () => string
  device: () => AnalyticsPayload['device']
  acquisition?:()=>Acquisition
  now?: () => number
}) {
  let consent: AnalyticsConsent = 'pending'
  let pageKey: string | undefined
  let window = 0, count = 0
  let hasPageView=false
  const listeners = new Set<() => void>(), seen = new Set<string>(), pending = new Set<AbortController>()
  const abort = () => { for (const request of pending) request.abort(); pending.clear() }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    snapshot: () => consent,
    choose(value: AnalyticsConsent) {
      if (consent === value) return
      consent = value
      if (value !== 'accepted') { abort(); seen.clear() }
      listeners.forEach(listener => listener())
    },
    navigate(key?: string) {
      const next = key && isAnalyticsKey(key) ? key : undefined
      if (next !== pageKey) { pageKey = next; seen.clear() }
    },
    track(event: BrowserEvent, details: { key?: string; step?: number; once?: string } = {}): boolean {
      if (!options.enabled || consent !== 'accepted' || !browserEvents.includes(event)) return false
      const key = details.key ?? pageKey
      if (key !== undefined && !isAnalyticsKey(key)) return false
      if (details.step !== undefined && (!Number.isInteger(details.step) || details.step < 0 || details.step > 100)) return false
      const dedupe = details.once ? `${event}:${key}:${details.once}` : undefined
      if (dedupe && seen.has(dedupe)) return false
      const minute = Math.floor((options.now?.() ?? Date.now()) / 60_000)
      if (minute !== window) { window = minute; count = 0 }
      if (count >= 45) return false
      count += 1
      if (dedupe) { if (seen.size >= 300) seen.clear(); seen.add(dedupe) }
      const payload: AnalyticsPayload = { event, eventId: options.randomID(), consent: true, device: options.device(), ...(key ? { pageKey: key } : {}), ...(details.step !== undefined ? { step: details.step } : {}) }
      if(event==='page_view'){payload.entry=!hasPageView;payload.acquisition=hasPageView?'internal':options.acquisition?.()||'unknown';hasPageView=true}
      const request = new AbortController(); pending.add(request)
      void options.send(payload, request.signal).catch(() => undefined).finally(() => pending.delete(request))
      return true
    },
    abort,
  }
}

export function progressMarkers(currentTime: number, duration: number, previous: ReadonlySet<number>): number[] {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return []
  const percentage = Math.min(100, Math.max(0, currentTime / duration * 100))
  return [25, 50, 75, 100].filter(marker => percentage >= marker && !previous.has(marker))
}
