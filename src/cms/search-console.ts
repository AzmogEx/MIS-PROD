import path from 'node:path'
import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import type { Payload } from 'payload'
import { hasRole, type CMSUser } from './access'

const scope = 'https://www.googleapis.com/auth/webmasters.readonly'
const tokenEndpoint = 'https://oauth2.googleapis.com/token'
const directory = () => path.resolve(process.env.CMS_SEARCH_CONSOLE_DIR || '.data/search-console')
type Fetch = typeof fetch
export class SearchConsoleError extends Error { constructor(message: string, readonly status = 400) { super(message) } }
export type SearchRow = { pageID: string; locale: 'fr' | 'en'; device: 'MOBILE' | 'TABLET' | 'DESKTOP'; date: string; clicks: number; impressions: number; position: number }
export type SearchRun = { key: string; propertyHash: string; from: string; to: string; state: 'running' | 'completed' | 'failed'; attemptedAt: string; completedAt?: string; error?: string; nextRow: number; truncated: boolean; rows: SearchRow[] }
export type SearchConsoleReport = { available: boolean; reason?: string; canSync: boolean; source: string; timezone: string; observation: SearchRun | null }

function requireRead(user: CMSUser) { if (!hasRole(user, ['owner', 'admin', 'sales'])) throw new SearchConsoleError('Accès commercial requis.', user ? 403 : 401) }
function configuration() {
  if (process.env.CMS_SEARCH_CONSOLE !== 'enabled') throw new SearchConsoleError('Search Console est désactivée. La connexion Google reste à autoriser et configurer.', 503)
  let site: URL
  try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL || '') } catch { throw new SearchConsoleError('Origine publique du site manquante.', 503) }
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) throw new SearchConsoleError('Search Console nécessite l’origine HTTPS canonique du site.', 503)
  const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || ''
  if (property !== site.origin + '/' && property !== `sc-domain:${site.hostname}`) throw new SearchConsoleError('La propriété Google doit correspondre exactement au domaine ou à l’origine du site configuré.', 503)
  const email = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || ''
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replaceAll('\\n', '\n') || ''
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(email) || !privateKey) throw new SearchConsoleError('Identifiants du compte de service Google absents ou invalides.', 503)
  return { site, property, email, privateKey }
}

function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new SearchConsoleError('Date invalide, format AAAA-MM-JJ requis.')
  return value
}
export function searchConsolePeriod(input: { from?: unknown; to?: unknown } = {}, now = new Date()) {
  // Search Console dates use Pacific time. Only completed, older days are queried.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const last = new Date(Date.parse(today) - 3 * 86400_000).toISOString().slice(0, 10)
  const to = date(input.to || last), from = date(input.from || new Date(Date.parse(to) - 27 * 86400_000).toISOString().slice(0, 10))
  if (from > to || to > last || Date.parse(to) - Date.parse(from) > 30 * 86400_000 || Date.parse(today) - Date.parse(from) > 16 * 31 * 86400_000) throw new SearchConsoleError('Choisissez 1 à 31 jours terminés depuis au moins 3 jours, dans les 16 derniers mois.')
  return { from, to }
}

async function readJSON<T>(filename: string): Promise<T | null> {
  try { if ((await stat(filename)).size > 8_000_000) throw new SearchConsoleError('État de synchronisation invalide.', 503); return JSON.parse(await readFile(filename, 'utf8')) as T } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
async function atomic(filename: string, value: unknown) {
  const temp = `${filename}.${randomUUID()}.tmp`
  try { await writeFile(temp, JSON.stringify(value), { flag: 'wx', mode: 0o600 }); await rename(temp, filename) } finally { await unlink(temp).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }) }
}
async function lock(payload: Payload) {
  await mkdir(directory(), { recursive: true })
  const now = new Date().toISOString(), expiresAt = new Date(Date.now() + 240_000).toISOString()
  const key = 'search-console:sync'
  await payload.delete({ collection: 'submission-limits', where: { and: [{ key: { equals: key } }, { expiresAt: { less_than: now } }] }, overrideAccess: true })
  try { await payload.create({ collection: 'submission-limits', data: { key, expiresAt }, overrideAccess: true }) }
  catch { throw new SearchConsoleError('Une synchronisation est déjà en cours. Réessayez après sa fin.', 409) }
  return () => payload.delete({ collection: 'submission-limits', where: { and: [{ key: { equals: key } }, { expiresAt: { equals: expiresAt } }] }, overrideAccess: true })
}

async function publishedPages(payload: Payload) {
  const pages = await payload.find({ collection: 'pages', where: { _status: { equals: 'published' } }, draft: false, trash: false, depth: 0, pagination: false, select: { path: true }, overrideAccess: true })
  return pages.docs.map(page => ({ id: String(page.id), path: String(page.path) }))
}
export async function readSearchConsole(payload: Payload, user: CMSUser): Promise<SearchConsoleReport> {
  requireRead(user)
  let available = true, reason: string | undefined
  try { configuration() } catch (error) { available = false; reason = error instanceof SearchConsoleError ? error.message : 'Configuration indisponible.' }
  const latest = await readJSON<{ key: string }>(path.join(directory(), 'latest.json'))
  let observation: SearchRun | null = null
  if (latest && /^[a-f0-9]{64}$/.test(latest.key)) observation = await readJSON<SearchRun>(path.join(directory(), `${latest.key}.json`))
  if (observation?.propertyHash !== createHash('sha256').update(process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || '').digest('hex')) observation = null
  if (observation) {
    const ids = new Set((await publishedPages(payload)).map(page => page.id))
    observation = { ...observation, rows: observation.rows.filter(row => ids.has(row.pageID)) }
  }
  return { available, reason, canSync: hasRole(user, ['owner', 'admin']), source: 'Google Search Console · résultats Web · données finales', timezone: 'America/Los_Angeles', observation }
}

async function responseJSON(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new SearchConsoleError(`Google a refusé la synchronisation (HTTP ${response.status}). Vérifiez les droits sur la propriété, l’API et les quotas.`, 502)
  if (Number(response.headers.get('content-length') || 0) > 4_000_000) throw new SearchConsoleError('Réponse Google trop volumineuse.', 502)
  const reader = response.body?.getReader(); if (!reader) throw new SearchConsoleError('Réponse Google vide.', 502)
  let length = 0; const chunks: Uint8Array[] = []
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 4_000_000) { await reader.cancel(); throw new SearchConsoleError('Réponse Google trop volumineuse.', 502) } chunks.push(chunk.value) } } finally { reader.releaseLock() }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}
async function googleToken(config: ReturnType<typeof configuration>, transport: Fetch) {
  let key
  try { key = createPrivateKey(config.privateKey); if (key.asymmetricKeyType !== 'rsa' || Number(key.asymmetricKeyDetails?.modulusLength) < 2048) throw new Error('key') } catch { throw new SearchConsoleError('Clé du compte de service invalide (RSA 2048 bits minimum).', 503) }
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const assertion = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: config.email, scope, aud: tokenEndpoint, iat: now, exp: now + 3600 })}`
  const jwt = `${assertion}.${sign('RSA-SHA256', Buffer.from(assertion), key).toString('base64url')}`
  const result = await responseJSON(await transport(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }), signal: AbortSignal.timeout(10_000), redirect: 'error' }))
  if (typeof result.access_token !== 'string' || !result.access_token || result.token_type !== 'Bearer') throw new SearchConsoleError('Jeton Google invalide.', 502)
  return result.access_token
}

/** External I/O occurs only here, after explicit configuration and manager access.
 * Tests inject a transport; API callers can never choose an endpoint or transport. */
export async function syncSearchConsole(payload: Payload, user: CMSUser, input: { from?: unknown; to?: unknown } = {}, transport: Fetch = fetch) {
  if (!hasRole(user, ['owner', 'admin'])) throw new SearchConsoleError('Synchronisation réservée au propriétaire et aux administrateurs.', user ? 403 : 401)
  const config = configuration(), period = searchConsolePeriod(input)
  const key = createHash('sha256').update(`${config.property}:${period.from}:${period.to}`).digest('hex')
  const release = await lock(payload)
  const filename = path.join(directory(), `${key}.json`)
  let run: SearchRun = { key, propertyHash: createHash('sha256').update(config.property).digest('hex'), ...period, state: 'running', attemptedAt: new Date().toISOString(), nextRow: 0, truncated: false, rows: [] }
  try {
    const existing = await readJSON<SearchRun>(filename)
    if (existing?.state === 'completed') { await atomic(path.join(directory(), 'latest.json'), { key }); return readSearchConsole(payload, user) }
    if (existing) run = { ...existing, state: 'running', error: undefined, attemptedAt: new Date().toISOString() }
    await atomic(filename, run); await atomic(path.join(directory(), 'latest.json'), { key })
    const pages = await publishedPages(payload), byPath = new Map<string, { pageID: string; locale: 'fr' | 'en' }>()
    for (const page of pages) { byPath.set(page.path, { pageID: page.id, locale: 'fr' }); byPath.set('/en' + (page.path === '/' ? '' : page.path), { pageID: page.id, locale: 'en' }) }
    const token = await googleToken(config, transport)
    const rows = new Map(run.rows.map(row => [`${row.pageID}:${row.locale}:${row.device}:${row.date}`, row]))
    for (let offset = run.nextRow; offset < 10000; offset += 1000) {
      const result = await responseJSON(await transport(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.property)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: period.from, endDate: period.to, dimensions: ['page', 'device', 'date'], type: 'web', dataState: 'final', rowLimit: 1000, startRow: offset }), signal: AbortSignal.timeout(10_000), redirect: 'error' }))
      if (result.rows !== undefined && !Array.isArray(result.rows)) throw new SearchConsoleError('Données Google invalides.', 502)
      const received = (result.rows || []) as Array<Record<string, unknown>>
      if (received.length > 1000) throw new SearchConsoleError('Pagination Google invalide.', 502)
      for (const row of received) {
        if (!Array.isArray(row.keys) || row.keys.length !== 3) continue
        const [pageURL, device, day] = row.keys
        let url: URL; try { url = new URL(String(pageURL)) } catch { continue }
        if (url.origin !== config.site.origin || url.search || url.hash || url.username || url.password) continue
        const page = byPath.get(url.pathname.replace(/\/$/, '') || '/')
        if (!page || !['MOBILE', 'TABLET', 'DESKTOP'].includes(String(device)) || typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day < period.from || day > period.to) continue
        if (![row.clicks, row.impressions, row.position].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0)) continue
        const safe: SearchRow = { ...page, date: day, device: device as SearchRow['device'], clicks: Number(row.clicks), impressions: Number(row.impressions), position: Number(row.position) }
        rows.set(`${safe.pageID}:${safe.locale}:${safe.device}:${day}`, safe)
      }
      run = { ...run, rows: [...rows.values()], nextRow: offset + 1000 }
      await atomic(filename, run)
      if (received.length < 1000) break
      if (offset === 9000) run.truncated = true
    }
    run = { ...run, state: 'completed', completedAt: new Date().toISOString() }; await atomic(filename, run)
    return await readSearchConsole(payload, user)
  } catch (error) {
    run = { ...run, state: 'failed', error: error instanceof SearchConsoleError ? error.message : 'Synchronisation interrompue ou délai dépassé. Vous pouvez reprendre ; les données déjà validées sont conservées.' }
    await atomic(filename, run)
    throw new SearchConsoleError(run.error!, error instanceof SearchConsoleError ? error.status : 502)
  } finally { await release() }
}
