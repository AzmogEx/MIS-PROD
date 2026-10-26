import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCMS } from '@/cms/payload'
import { hasRole } from '@/cms/access'
import { getSiteDiagnostics, type DiagnosticLevel, type DiagnosticScope } from '@/cms/diagnostics'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contrôle du site — MIS', robots: { index: false, follow: false } }
const levels: Record<DiagnosticLevel, { label: string; color: string }> = {
  error: { label: 'À corriger', color: 'border-red-300/25 bg-red-300/10 text-red-200' },
  warning: { label: 'À examiner', color: 'border-amber-300/25 bg-amber-300/10 text-amber-100' },
  review: { label: 'À faire valider', color: 'border-sky-300/25 bg-sky-300/10 text-sky-100' },
}
const scopes: Record<DiagnosticScope, string> = { published: 'Version publiée', draft: 'Version de travail', library: 'Bibliothèque' }
const control = 'min-h-11 rounded-md border border-white/20 bg-[#191b16] px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#c9a961]'

export default async function SiteControlPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cms = await getCMS()
  const { user } = await cms.auth({ headers: await headers() })
  if (!user) redirect('/admin/login?redirect=%2Fcontrole')
  if (!hasRole(user, ['owner', 'admin', 'editor'])) redirect('/admin')
  const report = await getSiteDiagnostics(cms, user)
  const params = await searchParams
  const scope = typeof params.scope === 'string' && params.scope in scopes ? params.scope as DiagnosticScope : undefined
  const level = typeof params.level === 'string' && params.level in levels ? params.level as DiagnosticLevel : undefined
  const diagnostics = report.diagnostics.filter(item => (!scope || item.scopes.includes(scope)) && (!level || item.level === level))
  const checkedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(report.checkedAt))

  return <div className="mx-auto max-w-[1440px] px-5 py-6 text-[#f1f0ea] sm:px-10 sm:py-9">
    <nav aria-label="Navigation du studio" className="mb-10 flex flex-wrap items-center gap-x-7 gap-y-4 border-b border-white/10 pb-6 text-sm">
      <Link href="/admin" className="mr-auto text-xl font-semibold tracking-[.12em]">MIS <span className="ml-2 text-xs font-normal tracking-normal text-white/50">Studio</span></Link>
      <Link href="/admin/collections/pages" className="text-white/70 hover:text-white">Pages</Link>
      <Link href="/medias" className="text-white/70 hover:text-white">Médiathèque</Link>
      <span aria-current="page" className="text-[#d9bf80]">Contrôle du site</span>
    </nav>
    <header className="mb-9 max-w-3xl">
      <p className="mb-3 text-xs uppercase tracking-[.2em] text-[#c9a961]">Qualité & exploitation</p>
      <h1 className="mb-4 font-serif text-4xl sm:text-5xl">Ce qui mérite votre attention.</h1>
      <p className="max-w-2xl text-base leading-7 text-white/65">Retrouvez les liens à réparer, les contenus à valider et l’état des services. Chaque constat indique sa source et ouvre la fiche concernée.</p>
      <p className="mt-4 text-xs leading-6 text-white/45">Contrôle du {checkedAt}, heure de Paris · Contenus français · {report.publishedPages} pages publiées · {report.workingPages} versions de travail · {report.mediaCount} médias</p>
    </header>

    <section aria-labelledby="findings-heading" className="mb-12">
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        {(Object.entries(levels) as [DiagnosticLevel, typeof levels.error][]).map(([key, value]) => <Link href={`/controle?level=${key}#findings-heading`} key={key} className={`rounded-lg border p-5 transition hover:brightness-125 ${value.color}`}>
          <p className="mb-3 text-3xl tabular-nums">{report.diagnostics.filter(item => item.level === key).length}</p><p className="text-sm">{value.label}</p>
        </Link>)}
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
        <div><h2 id="findings-heading" className="mb-2 text-xl font-medium">Constats éditoriaux et techniques</h2><p className="text-sm text-white/55">{diagnostics.length} constat{diagnostics.length > 1 ? 's' : ''} affiché{diagnostics.length > 1 ? 's' : ''} sur {report.diagnostics.length}. Un même constat peut concerner les deux versions.</p></div>
        <form className="flex flex-wrap items-end gap-3" action="/controle">
          <label className="grid gap-2 text-xs text-white/60">Version<select name="scope" defaultValue={scope || ''} className={control}><option value="">Toutes les versions</option>{Object.entries(scopes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
          <label className="grid gap-2 text-xs text-white/60">Nature<select name="level" defaultValue={level || ''} className={control}><option value="">Tous les constats</option>{Object.entries(levels).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          <button type="submit" className={`${control} cursor-pointer hover:border-[#c9a961]`}>Filtrer</button>
        </form>
      </div>
      {report.limits.length > 0 && <div role="status" className="mb-5 rounded border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100"><strong>Analyse partielle.</strong> {report.limits.join(' ')}</div>}
      {diagnostics.length === 0 ? <div className="rounded-lg border border-white/15 bg-white/[.025] p-8"><h3 className="mb-2 font-medium">Aucun constat dans cette sélection.</h3><p className="max-w-2xl text-sm leading-6 text-white/60">Ce résultat porte sur les contrôles décrits ci-dessous. Il ne certifie ni la conformité juridique, ni l’exactitude des preuves commerciales, ni la disponibilité des services externes.</p></div> : <ol className="space-y-3">
        {diagnostics.map(item => <li key={item.id} className="rounded-lg border border-white/10 bg-white/[.025] p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div className="min-w-0 flex-1 basis-80">
              <div className="mb-3 flex flex-wrap gap-2"><span className={`rounded border px-2 py-1 text-[11px] ${levels[item.level].color}`}>{levels[item.level].label}</span>{item.scopes.map(value => <span key={value} className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/55">{scopes[value]}</span>)}</div>
              <h3 className="mb-2 font-medium">{item.title}</h3>
              <p className="max-w-3xl break-words text-sm leading-6 text-white/65">{item.detail}</p>
              <p className="mt-3 break-words text-xs leading-5 text-white/45">Source : {item.source}<br /><span className="font-mono">{item.field}</span></p>
            </div>
            <Link className="inline-flex min-h-11 items-center gap-3 rounded-md border border-[#c9a961]/40 px-4 py-2 text-sm text-[#dfc889] hover:bg-[#c9a961]/10 focus-visible:outline-2 focus-visible:outline-[#c9a961]" href={item.href}>Ouvrir la fiche <span aria-hidden>↗</span></Link>
          </div>
        </li>)}
      </ol>}
    </section>

    <section aria-labelledby="integrations-heading" className="border-t border-white/10 pt-9">
      <h2 id="integrations-heading" className="mb-2 text-xl font-medium">Services et continuité</h2>
      <p className="mb-6 text-sm leading-6 text-white/55">Ces états proviennent de la configuration locale et des journaux disponibles. Aucun email, appel externe ou génération IA n’est déclenché en ouvrant cette page.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{report.integrations.map(item => <article key={item.key} className="flex flex-col rounded-lg border border-white/10 bg-white/[.025] p-6">
        <h3 className="mb-4 text-sm text-white/65">{item.title}</h3><p className="mb-3 text-lg text-[#ddc486]">{item.state}</p><p className="mb-5 text-sm leading-6 text-white/55">{item.detail}</p>
        {item.href && <Link className="mt-auto inline-flex min-h-11 items-center text-sm text-[#ddc486] underline-offset-4 hover:underline" href={item.href}>Consulter les réglages ou le journal ↗</Link>}
      </article>)}</div>
    </section>
    <details className="mb-5 mt-9 rounded-lg border border-white/10 p-5 text-sm text-white/60">
      <summary className="cursor-pointer py-1 text-white/80">Périmètre et limites des contrôles</summary>
      <div className="mt-4 max-w-4xl space-y-3 leading-7">
        <p>Le contrôle lit les pages françaises publiées et les dernières versions de travail, la navigation, les sections synchronisées, les formulaires publiés et la médiathèque. Les blocs masqués sont ignorés. Les chemins internes, redirections et ancres de section sont confrontés aux contenus présents ; les pages sans chemin depuis l’accueil ou la navigation sont signalées.</p>
        <p>Les fichiers sont vérifiés sur le disque de ce serveur. Les adresses externes, vidéos distantes, performances, contrastes, traductions et éventuelles ancres ajoutées par un service tiers ne sont pas testés. Une date de droits ne remplace pas la vérification des autorisations. Les cases de validation éditoriale reflètent une décision de l’équipe, pas un contrôle automatique de vérité.</p>
        <p>Les pages de travail peuvent contenir des changements non publiés. Ce contrôle ne modifie aucun contenu et n’applique aucune correction automatiquement.</p>
      </div>
    </details>
  </div>
}
