import path from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import type { Payload } from 'payload'
import { hasRole, type CMSUser } from './access'
import { fromPayloadContent } from './content-fields'
import { workerIntegration } from './worker-health'
import { privateStorageObservation } from './client-services'

type Row = Record<string, unknown>
export type DiagnosticScope = 'published' | 'draft' | 'library'
export type DiagnosticLevel = 'error' | 'warning' | 'review'
export interface SiteDiagnostic {
  id: string; code: string; level: DiagnosticLevel; title: string; detail: string
  source: string; field: string; href: string; scopes: DiagnosticScope[]
}
export interface ContentSnapshot { pages: Row[]; content: Row; sections?: Row[] }
export interface DiagnosticsInput {
  published: ContentSnapshot; draft: ContentSnapshot; media: Row[]; forms: Row[]; redirects?: Row[]
  /** Locally checked files only. Missing entries mean not checked, never a remote probe. */
  files?: Record<string, boolean>; now?: string
}
export interface IntegrationState { key: string; title: string; state: string; detail: string; href?: string }
export interface DiagnosticsReport {
  checkedAt: string; diagnostics: SiteDiagnostic[]; integrations: IntegrationState[]
  publishedPages: number; workingPages: number; mediaCount: number; limits: string[]
}

const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter(v => v && typeof v === 'object' && !Array.isArray(v)) as Row[] : []
const str = (value: unknown) => typeof value === 'string' ? value : ''
const ref = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : value && typeof value === 'object' && 'id' in value ? ref(value.id) : ''
const editor = (collection: string, id: unknown) => `/admin/collections/${collection}/${encodeURIComponent(ref(id))}`
const contentHref = '/admin/globals/site-content'
const placeholders = /\[(?:à\s+compléter|a\s+completer|à\s+renseigner|todo|placeholder)[^\]]*\]|\b(?:lorem ipsum|your company|example\.com)\b/i
const mediaKeys = /^(media|image|poster|captions|imageSrc|videoSrc|videoUrl|logoImage|favicon|shortcutIcon|appleIcon|shareImage)$/
const linkKeys = /^(href|link)$|Href$/
const groups: Record<string, string[]> = {
  hero: ['hero'], manifesto: ['manifesto'], stats: ['stats'], universes: ['universesSection', 'universes'],
  portfolio: ['portfolioSection', 'projects'], clients: ['clientsSection', 'clients', 'testimonials'],
  cta: ['cta'], pricing: ['pricing'], universe: ['universeTemplate'],
}
const legacyAnchors: Record<string, string[]> = {
  manifesto: ['manifeste', 'manifesto-heading'], stats: ['stats-heading'], universes: ['univers', 'universes-heading'],
  portfolio: ['realisations', 'portfolio-heading'], clients: ['confiance', 'clients-heading'], pricing: ['tarifs', 'pricing-heading'], cta: ['cta-heading'],
}
function walk(value: unknown, visit: (key: string, value: unknown, field: string) => void, base = '') {
  if (Array.isArray(value)) value.forEach((child, index) => walk(child, visit, `${base}[${index + 1}]`))
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    const field = base ? `${base}.${key}` : key
    visit(key, child, field)
    if (key !== 'section') walk(child, visit, field)
  }
}
function localPath(value: string): string | undefined {
  if (!value.startsWith('/') || value.startsWith('//')) return
  try { return decodeURIComponent(new URL(value, 'https://local.invalid').pathname) } catch { return }
}
function sameOriginLink(value: string, from: string, siteURL: string): { path: string; anchor: string } | undefined {
  if (!value || /^(mailto:|tel:)/i.test(value)) return
  try {
    const base = new URL(siteURL || 'https://local.invalid')
    const url = new URL(value, new URL(from, base))
    if (url.origin !== base.origin) return
    return { path: decodeURIComponent(url.pathname).replace(/\/$/, '') || '/', anchor: decodeURIComponent(url.hash.slice(1)) }
  } catch { return }
}

/** Deterministic content checks: no network, writes, default seed data or inferred score. */
export function diagnoseSite(input: DiagnosticsInput): SiteDiagnostic[] {
  const findings = new Map<string, SiteDiagnostic>()
  const now = Date.parse(input.now || new Date().toISOString())
  const media = new Map(input.media.map(item => [ref(item.id), item]))
  const mediaURLs = new Map(input.media.filter(item => item.url).map(item => [localPath(str(item.url)) || str(item.url), item]))
  const forms = new Set(input.forms.filter(item => item._status === 'published').map(item => str(item.slug)))
  const redirects = new Map((input.redirects || []).map(item => [str(item.from), str(item.to)]))
  const add = (scope: DiagnosticScope, code: string, level: DiagnosticLevel, title: string, detail: string, source: string, field: string, href: string) => {
    const id = `${code}:${href}:${field}:${detail}`
    const previous = findings.get(id)
    if (previous) { if (!previous.scopes.includes(scope)) previous.scopes.push(scope); return }
    findings.set(id, { id, code, level, title, detail, source, field, href, scopes: [scope] })
  }
  const checkMedia = (value: unknown, scope: DiagnosticScope, source: string, field: string, href: string) => {
    if (value === undefined || value === null || value === '') return
    const valueString = str(value)
    const item = typeof value === 'object' ? media.get(ref(value)) || row(value) : media.get(ref(value)) || mediaURLs.get(localPath(valueString) || valueString)
    if (item) {
      if (item.rightsUntil && Date.parse(str(item.rightsUntil)) <= now) add(scope, 'media-expired', 'error', 'Droits de diffusion expirés', 'Ce média référencé n’est plus accessible au public.', source, field, editor('media', item.id))
      if (item.visibility === 'restricted') add(scope, 'media-restricted', 'error', 'Média référencé à diffusion restreinte', 'Cette référence est masquée aux visiteurs. Vérifiez les droits avant de changer sa diffusion.', source, field, editor('media', item.id))
      if (!item.filename || input.files?.[`media:${ref(item.id)}`] === false) add(scope, 'media-file-missing', 'error', 'Fichier média manquant', 'La fiche média existe mais le fichier local attendu est absent.', source, field, editor('media', item.id))
      return
    }
    if (typeof value === 'number' || (valueString && /^\d+$/.test(valueString)) || typeof value === 'object') add(scope, 'media-reference-missing', 'error', 'Référence média introuvable', 'Le média lié à ce champ n’existe plus dans la médiathèque.', source, field, href)
    else if (valueString.startsWith('/api/media/file/')) add(scope, 'media-reference-missing', 'error', 'Adresse de média introuvable', 'Aucune fiche média ne correspond à cette adresse.', source, field, href)
    else if (localPath(valueString) && input.files?.[localPath(valueString)!] === false) add(scope, 'local-file-missing', 'error', 'Fichier local manquant', `Le fichier ${localPath(valueString)} est absent du dossier public.`, source, field, href)
    else if (/picsum\.photos|placehold\.co|placeholder/i.test(valueString)) add(scope, 'media-demo', 'review', 'Visuel de démonstration', 'Remplacez ce visuel ou confirmez son usage avant diffusion.', source, field, href)
  }
  for (const scope of ['published', 'draft'] as const) {
    const snapshot = input[scope]
    const pages = snapshot.pages.filter(item => !item.deletedAt && (scope !== 'published' || item._status === 'published'))
    const pageMap = new Map(pages.map(item => [str(item.path), item]))
    const sectionMap = new Map((snapshot.sections || []).map(item => [ref(item.id), item]))
    const anchors = new Map<string, Set<string>>()
    const edges = new Map<string, Set<string>>()
    const roots = new Set<string>(['/'])
    const pageLinks: { value: string; page: string; source: string; field: string; href: string; navigation?: boolean }[] = []
    const checkedGroups = new Set<string>()
    let hasContact = false
    const inspect = (value: unknown, page: string, source: string, base: string, href: string, navigation = false) => {
      walk(value, (key, child, field) => {
        if (mediaKeys.test(key)) checkMedia(child, scope, source, field, href)
        if (linkKeys.test(key) && typeof child === 'string') pageLinks.push({ value: child, page, source, field, href, navigation })
        if (key !== 'source' && typeof child === 'string' && placeholders.test(child)) add(scope, 'placeholder', 'review', 'Texte provisoire à compléter', child.length > 150 ? `${child.slice(0, 150)}…` : child, source, field, href)
      }, base)
    }
    for (const group of ['site', 'identity', 'navigation', 'footer', 'notFound']) inspect(snapshot.content[group], '/', 'Identité et navigation', group, contentHref, ['navigation', 'footer'].includes(group))
    for (const field of ['site.address.street', 'site.legal.siret', 'site.legal.director']) {
      let value: unknown = snapshot.content
      for (const part of field.split('.')) value = row(value)[part]
      if (!str(value).trim()) add(scope, 'legal-missing', 'review', 'Information légale non renseignée', 'Ce champ est vide. Faites confirmer les informations applicables au studio.', 'Identité du studio', field, contentHref)
    }
    for (const page of pages) {
      const pagePath = str(page.path)
      const pageSource = `${str(page.title) || 'Page'} · ${pagePath}`
      const href = editor('pages', page.id)
      const pageAnchors = new Set<string>()
      anchors.set(pagePath, pageAnchors); edges.set(pagePath, new Set())
      inspect(page.seo, pagePath, pageSource, 'seo', href)
      const blocks = (layout: unknown, source: string, base: string, correction: string, seen = new Set<string>()) => {
        rows(layout).forEach((block, index) => {
          if (block.hidden) return
          const field = `${base}[${index + 1}]`
          const type = str(block.blockType)
          if (block.anchor) pageAnchors.add(str(block.anchor))
          for (const anchor of legacyAnchors[type] || []) pageAnchors.add(anchor)
          inspect(block, pagePath, source, field, correction)
          for (const group of groups[type] || []) {
            // Text evidence is shared, but relative links are evaluated on each using page.
            inspect(snapshot.content[group], pagePath, `Contenus partagés · ${group}`, group, contentHref)
            checkedGroups.add(group)
          }
          if (type === 'universe') {
            const index = rows(snapshot.content.universes).findIndex(item => item.slug === block.universeSlug)
            if (index < 0) add(scope, 'universe-missing', 'error', 'Univers introuvable', `L’univers ${str(block.universeSlug)} n’est pas renseigné dans les contenus partagés.`, source, `${field}.universeSlug`, correction)
            else inspect(rows(snapshot.content.universes)[index], pagePath, 'Contenus partagés · Univers', `universes[${index + 1}]`, contentHref)
            if (block.universeSlug === 'particuliers') { pageAnchors.add('tarifs'); inspect(snapshot.content.pricing, pagePath, 'Tarifs mariage', 'pricing', contentHref) }
          }
          if (type === 'contact') {
            const slug = str(block.formSlug) || 'brief-projet'
            if (forms.has(slug)) hasContact = true
            else add(scope, 'form-unavailable', 'error', 'Formulaire non publié ou introuvable', `Le bloc demande le formulaire « ${slug} ». Le site n’utilise que les formulaires publiés.`, source, `${field}.formSlug`, '/admin/collections/forms')
          }
          if (type === 'gallery') rows(block.items).forEach((item, position) => { if (!item.media) add(scope, 'gallery-media-empty', 'error', 'Emplacement de galerie vide', 'Sélectionnez un média ou supprimez cet emplacement.', source, `${field}.items[${position + 1}].media`, correction) })
          if (type === 'shared') {
            const id = ref(block.section)
            const section = sectionMap.get(id)
            if (!section) add(scope, 'section-missing', 'error', 'Section synchronisée indisponible', 'La section est absente, à la corbeille ou non publiée dans cette version.', source, `${field}.section`, correction)
            else if (seen.has(id)) add(scope, 'section-cycle', 'error', 'Boucle de sections synchronisées', 'La composition se référence elle-même.', source, field, correction)
            else blocks(section.layout, `Section · ${str(section.title)}`, 'layout', editor('shared-sections', section.id), new Set([...seen, id]))
          }
          if (type === 'legal') rows(block.sections).forEach((item, position) => {
            for (const token of str(item.text).matchAll(/\{\{([a-zA-Z0-9.]+)\}\}/g)) {
              let value: unknown = snapshot.content
              for (const key of token[1].split('.')) value = row(value)[key]
              if (typeof value !== 'string' && typeof value !== 'number' || !String(value).trim()) add(scope, 'legal-token-empty', 'review', 'Coordonnée légale affichée vide', `La variable {{${token[1]}}} ne contient aucune valeur utilisable.`, source, `${field}.sections[${position + 1}]`, contentHref)
            }
          })
        })
      }
      blocks(page.layout, pageSource, 'layout', href)
    }
    for (const group of ['stats', 'projects', 'clients', 'testimonials']) {
      if (!checkedGroups.has(group)) continue
      const values = group === 'stats' ? rows(row(snapshot.content.stats).items) : rows(snapshot.content[group])
      values.forEach((item, index) => {
        const field = `${group}${group === 'stats' ? '.items' : ''}[${index + 1}]`
        if (item.verified !== true) add(scope, 'unverified-claim', 'review', 'Chiffre ou référence sans validation éditoriale', 'La case de vérification n’est pas cochée. Renseignez un justificatif puis faites valider cette donnée.', `Contenus partagés · ${group}`, field, contentHref)
        if (group === 'projects' && item.seed && !str(item.imageSrc)) add(scope, 'demo-fallback', 'review', 'Visuel de repli à vérifier', 'Cette réalisation conserve un identifiant de visuel de démonstration. Vérifiez sa photo dans la fiche.', `Contenus partagés · ${group}`, `${field}.imageSrc`, contentHref)
      })
    }
    const resolveLink = (link: { path: string; anchor: string }) => {
      const visited = new Set<string>()
      let next = link
      while (redirects.has(next.path) && !pageMap.has(next.path)) {
        if (visited.has(next.path) || visited.size >= 50) return undefined
        visited.add(next.path)
        const destination = sameOriginLink(redirects.get(next.path)!, next.path, str(row(snapshot.content.site).url))
        if (!destination) return undefined
        next = { ...destination, anchor: destination.anchor || next.anchor }
      }
      return next
    }
    for (const link of pageLinks) {
      const internal = sameOriginLink(link.value, link.page, str(row(snapshot.content.site).url))
      if (!internal || /^\/(api|admin|espace-client|gestion|controle|atelier|apercu|medias)(\/|$)/.test(internal.path)) continue
      if (input.files?.[internal.path] === true) continue
      const target = resolveLink(internal)
      if (!target || !pageMap.has(target.path)) add(scope, 'broken-link', 'error', 'Lien interne sans page accessible', `Le lien ${link.value} ne mène à aucune page de cette version.`, link.source, link.field, link.href)
      else {
        if (link.navigation) roots.add(target.path)
        edges.get(link.page)?.add(target.path)
        if (target.anchor && !anchors.get(target.path)?.has(target.anchor)) add(scope, 'broken-anchor', 'warning', 'Ancre absente de la page', `L’ancre #${target.anchor} n’existe pas dans ${target.path}.`, link.source, link.field, link.href)
      }
    }
    const reachable = new Set<string>(); const queue = [...roots]
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]
      if (reachable.has(current)) continue
      reachable.add(current)
      queue.push(...(edges.get(current) || []))
    }
    for (const page of pages) if (!reachable.has(str(page.path))) add(scope, 'orphan-page', 'warning', 'Page sans chemin depuis la navigation', 'Aucun chemin n’a été trouvé depuis l’accueil, les menus ou le pied de page. Ajoutez un lien si cette page doit être découvrable.', `${str(page.title)} · ${str(page.path)}`, 'path', editor('pages', page.id))
    if (!hasContact) add(scope, 'contact-missing', 'error', 'Aucun formulaire de contact utilisable', 'Aucun bloc visible ne référence un formulaire publié. Le contact par email peut rester disponible.', 'Parcours de contact', 'layout.contact', '/admin/collections/pages')
  }
  for (const item of input.media) {
    const source = str(item.alt) || str(item.filename) || `Média ${ref(item.id)}`
    const href = editor('media', item.id)
    if (item.rightsUntil && Date.parse(str(item.rightsUntil)) <= now) add('library', 'library-rights-expired', 'review', 'Droits arrivés à échéance', 'Ce média est conservé dans la bibliothèque mais sa diffusion publique est bloquée.', source, 'rightsUntil', href)
    if (input.files?.[`media:${ref(item.id)}`] === false) add('library', 'library-file-missing', 'error', 'Fichier absent de la médiathèque', 'La fiche est présente en base mais son fichier local est introuvable.', source, 'filename', href)
  }
  const priority = { error: 0, warning: 1, review: 2 }
  return [...findings.values()].sort((a, b) => priority[a.level] - priority[b.level] || a.source.localeCompare(b.source, 'fr') || a.field.localeCompare(b.field))
}

export function diagnoseIntegrations(env: Record<string, string | undefined>, settings: Row, backup: unknown, now = new Date()): IntegrationState[] {
  const enabled = env.CMS_EMAIL_DELIVERY === 'enabled'
  const emailConfigured = Boolean(env.RESEND_API_KEY && env.CONTACT_SENDER)
  const states: IntegrationState[] = [
    { key: 'email', title: 'Notifications email · Resend', state: !enabled ? 'Mode test' : emailConfigured ? 'Envoi réel autorisé' : 'Configuration incomplète', detail: !enabled ? 'Les notifications sont capturées localement. Aucun email réel ne part dans ce mode.' : emailConfigured ? 'L’autorisation et les paramètres sont présents. La connectivité, le domaine expéditeur et la réception ne sont pas testés par ce contrôle.' : 'L’envoi réel est autorisé, mais la clé fournisseur ou l’expéditeur manque. Les briefs restent enregistrés.', href: '/admin/collections/notifications' },
    { key:'auth-email',title:'Récupération de compte · Resend',state:env.CMS_AUTH_EMAIL_DELIVERY!=='enabled'?'Boîte locale':emailConfigured?'Configurée, réception non vérifiée':'Configuration incomplète',detail:'Activation séparée des emails de briefs. Sans activation explicite, les liens de récupération restent dans la boîte privée du serveur.' },
    { key:'retention',title:'Conservation des données',state:env.CMS_RETENTION_ENABLED==='enabled'?'Politique activée':'Application désactivée',detail:`Durées configurées en jours (0 = conserver) : audience ${env.CMS_RETENTION_ANALYTICS_DAYS||0}, journal ${env.CMS_RETENTION_AUDIT_DAYS||0}, archivage briefs ${env.CMS_RETENTION_BRIEF_DAYS||0}. L’aperçu cms:retention ne supprime rien. Les archives privées nécessitent leur propre politique.` },
    { key: 'audience', title: 'Mesure d’audience navigateur', state: env.CMS_BROWSER_ANALYTICS === 'enabled' ? 'Collecte autorisée' : 'Désactivée', detail: env.CMS_BROWSER_ANALYTICS === 'enabled' ? 'Le point de collecte accepte uniquement les événements avec consentement explicite. La présence d’un parcours de consentement et d’une instrumentation sur le site reste à vérifier.' : 'Aucun suivi navigateur n’est activé. Les briefs reçus produisent toujours un événement serveur sans donnée personnelle.', href: '/gestion?view=stats' },
    { key: 'search-console', title: 'Search Console', state: env.CMS_SEARCH_CONSOLE !== 'enabled' ? 'Désactivée' : env.GOOGLE_SEARCH_CONSOLE_PROPERTY && env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ? 'Configurée, synchronisation à vérifier' : 'Configuration incomplète', detail: 'Adaptateur Google en lecture seule. Les dates, résultats et reprises réels sont visibles dans Statistiques. Aucune connexion n’est testée par ce diagnostic.', href: '/gestion?view=stats' },
  ]
  let local = false
  try { const url = new URL(env.OLLAMA_BASE_URL || ''); local = ['127.0.0.1', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password } catch { /* Not configured. */ }
  const model = str(settings.model).trim()
  states.push({ key: 'ollama', title: 'Assistance IA locale · Ollama', state: !settings.enabled ? 'Désactivée' : !local || !model || /cloud|https?:/i.test(model) ? 'Configuration incomplète' : 'Configurée, disponibilité inconnue', detail: !settings.enabled ? 'Aucune génération n’est activée.' : !local ? 'L’adresse locale doit cibler 127.0.0.1 ou ::1.' : !model || /cloud|https?:/i.test(model) ? 'Un identifiant de modèle local doit être renseigné.' : 'Aucun appel réseau ni génération n’a été effectué. La présence du modèle installé sera vérifiée au moment d’une demande.', href: '/admin/globals/ai-settings' })
  const report = row(backup)
  const completedAt = str(report.completedAt)
  const stamp = Date.parse(completedAt)
  const valid = report.status === 'completed' && Number.isFinite(stamp) && stamp <= now.getTime() + 60_000
  const date = valid ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(stamp)) : ''
  states.push({ key: 'backup', title: 'Dernière sauvegarde locale', state: valid ? `Terminée le ${date}` : 'État inconnu', detail: valid ? 'Une exécution terminée est attestée par le journal local de sauvegarde. Ce constat ne prouve ni une copie hors du serveur, ni un test de restauration.' : 'Aucun journal de sauvegarde terminée valide n’a été trouvé. Une base existante ne constitue pas une preuve de sauvegarde.' })
  return states
}

async function fileExists(filename: string) { try { return (await stat(filename)).isFile() } catch { return false } }
export async function getSiteDiagnostics(payload: Payload, user: CMSUser): Promise<DiagnosticsReport> {
  if (!hasRole(user, ['owner', 'admin', 'editor'])) throw new Error('Accès réservé aux responsables éditoriaux.')
  const limits: string[] = []
  const find = async (collection: string, draft = false) => {
    const result = await payload.find({ collection, draft, locale: 'fr', depth: 0, limit: 5000, overrideAccess: false, user: user!, ...(draft ? {} : ['pages', 'shared-sections', 'forms'].includes(collection) ? { where: { _status: { equals: 'published' } } } : {}) })
    if (result.hasNextPage) limits.push(`${collection} : seuls les 5 000 premiers documents ont été analysés.`)
    return result.docs as Row[]
  }
  const contentSnapshot = async (draft: boolean) => {
    // SQLite's JSON argument limit also applies to the joined localized row.
    // Bounded group selections keep this read independent of the global's total size.
    const batches = [
      ['site', 'identity', 'navigation', 'footer'], ['hero', 'manifesto', 'stats', 'universesSection'],
      ['universes', 'projects', 'portfolioSection'], ['clients', 'testimonials', 'clientsSection', 'cta'],
      ['universeTemplate', 'pricing', 'ui', 'notFound'],
    ]
    const results = await Promise.all(batches.map(fields => payload.findGlobal({ slug: 'site-content', draft, locale: 'fr', depth: 0, overrideAccess: false, user: user!, select: Object.fromEntries(fields.map(field => [field, true])) })))
    return fromPayloadContent(Object.assign({}, ...results)) as unknown as Row
  }
  const [publishedPages, draftPages, content, draftContent, media, forms, redirects, publishedSections, draftSections, settings] = await Promise.all([
    find('pages'), find('pages', true), contentSnapshot(false), contentSnapshot(true), find('media'), find('forms'), find('redirects'),
    find('shared-sections'), find('shared-sections', true), payload.findGlobal({ slug: 'ai-settings', depth: 0, overrideAccess: false, user: user! }),
  ])
  const files: Record<string, boolean> = {}
  const publicFiles = new Set<string>()
  for (const source of [content, draftContent, publishedPages, draftPages, publishedSections, draftSections]) walk(source, (key, value) => {
    if ((mediaKeys.test(key) || linkKeys.test(key)) && typeof value === 'string') { const pathname = localPath(value); if (pathname && !pathname.startsWith('/api/') && path.extname(pathname)) publicFiles.add(pathname) }
  })
  const publicRoot = path.resolve('public'); const mediaRoot = path.resolve(process.env.CMS_MEDIA_DIR || '.data/media')
  // Bounded batches avoid exhausting file descriptors on larger libraries.
  const checks = [
    ...[...publicFiles].map(file => ({ key: file, root: publicRoot, name: `.${file}` })),
    ...media.filter(item => item.filename).map(item => ({ key: `media:${ref(item.id)}`, root: mediaRoot, name: str(item.filename) })),
  ]
  for (let start = 0; start < checks.length; start += 40) await Promise.all(checks.slice(start, start + 40).map(async check => {
    const filename = path.resolve(check.root, check.name)
    files[check.key] = filename.startsWith(`${check.root}${path.sep}`) && await fileExists(filename)
  }))
  let backup: unknown
  try { const filename = path.resolve('.data/health/backup.json'); if ((await stat(filename)).size <= 65536) backup = JSON.parse(await readFile(filename, 'utf8')) } catch { /* Missing or invalid is explicitly unknown. */ }
  const checkedAt = new Date().toISOString()
  const operations: IntegrationState[] = [await workerIntegration(hasRole(user, ['owner', 'admin']))]
  if (hasRole(user, ['owner', 'admin'])) {
    try {
      const storage = await privateStorageObservation()
      const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(storage.observedAt))
      operations.push({ key: 'private-storage', title: 'Stockage privé des clients', state: storage.bytes >= storage.maxStorageBytes ? 'Quota atteint' : storage.bytes >= storage.maxStorageBytes * 0.9 ? 'Quota bientôt atteint' : 'Occupation mesurée', detail: `${storage.files} fichiers, ${storage.bytes} octets sur ${storage.maxStorageBytes}. Observation : ${date} (Europe/Paris). La capacité physique restante du volume est à contrôler sur l’hôte.`, href: '/admin/collections/private-files' })
    } catch { operations.push({ key: 'private-storage', title: 'Stockage privé des clients', state: 'Mesure indisponible', detail: 'Le stockage privé n’a pas pu être lu. Vérifier son chemin et ses permissions ; aucune occupation n’est supposée.' }) }
  }
  return {
    checkedAt, diagnostics: diagnoseSite({ published: { pages: publishedPages, content: row(content), sections: publishedSections }, draft: { pages: draftPages, content: row(draftContent), sections: draftSections }, media, forms, redirects, files, now: checkedAt }),
    integrations: [...diagnoseIntegrations(process.env, row(settings), backup, new Date(checkedAt)), ...operations].map(item => !hasRole(user, ['owner', 'admin']) && ['email', 'audience'].includes(item.key) ? { ...item, href: undefined } : item), publishedPages: publishedPages.length, workingPages: draftPages.length, mediaCount: media.length, limits,
  }
}
