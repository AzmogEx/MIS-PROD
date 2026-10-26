'use client'
import { useEffect, useState } from 'react'
import type { SearchConsoleReport } from '@/cms/search-console'

export function SearchConsolePanel() {
  const [report, setReport] = useState<SearchConsoleReport | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  useEffect(() => { const controller = new AbortController(); fetch('/api/search-console', { cache: 'no-store', signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setReport(data) }).catch(error => { if (error.name !== 'AbortError') setError('Search Console est momentanément indisponible.') }); return () => controller.abort() }, [])
  const sync = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/search-console', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(from ? { from } : {}), ...(to ? { to } : {}) }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Synchronisation impossible.'); setReport(data)
    } catch (error) { setError(error instanceof Error ? error.message : 'Synchronisation interrompue.'); const response = await fetch('/api/search-console', { cache: 'no-store' }); if (response.ok) setReport(await response.json()) }
    finally { setBusy(false) }
  }
  const observation = report?.observation
  const totals = (observation?.rows || []).reduce((sum, row) => ({ clicks: sum.clicks + row.clicks, impressions: sum.impressions + row.impressions }), { clicks: 0, impressions: 0 })
  return <section className="space-y-4 rounded-xl border border-white/10 p-5">
    <h2 className="text-sm font-semibold">Google Search Console</h2>
    <p className="text-xs leading-relaxed text-[#a6afa7]">Résultats Web Google, par page publiée, appareil et date. Jours Google en heure du Pacifique. Aucun mot-clé, identifiant visiteur ou URL avec paramètres n’est conservé. Les résultats de l’API ne couvrent pas nécessairement toutes les recherches.</p>
    {!report ? <p role="status">Lecture de l’état de connexion…</p> : !report.available ? <p role="status">À connecter — {report.reason}</p> : <p role="status">Connexion configurée. Seule une synchronisation terminée atteste une réponse Google.</p>}
    {report?.canSync && <div className="flex flex-wrap items-end gap-3"><label className="text-xs">Du<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-2 block min-h-11 rounded border border-white/20 bg-transparent p-2" /></label><label className="text-xs">Au<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-2 block min-h-11 rounded border border-white/20 bg-transparent p-2" /></label><button disabled={busy || !report.available} onClick={() => void sync()} className="min-h-11 rounded border border-white/20 px-4 py-2 disabled:opacity-50">{busy ? 'Synchronisation…' : observation?.state === 'failed' || observation?.state === 'running' ? 'Reprendre la synchronisation' : 'Synchroniser'}</button><p className="w-full text-xs text-[#a6afa7]">Sans dates : 28 jours terminés depuis au moins 3 jours. Même période terminée : résultat conservé, aucun nouvel appel.</p></div>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {observation ? <><p className="text-xs text-[#a6afa7]">Période {observation.from} → {observation.to} · {observation.state === 'completed' ? 'Terminée' : observation.state === 'running' ? 'En cours / reprise possible après 4 minutes' : 'Échec, données partielles'} · observation {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(observation.completedAt || observation.attemptedAt))}</p>{observation.error && <p role="status">{observation.error}</p>}{observation.truncated && <p>Limite de 10 000 lignes atteinte : période partielle, réduisez sa durée.</p>}<p className="text-sm">{totals.clicks} clics · {totals.impressions} impressions · taux de clics {totals.impressions ? (100 * totals.clicks / totals.impressions).toFixed(2) + ' %' : 'non calculable'}</p>{observation.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Page</th><th>Date</th><th>Appareil</th><th>Clics</th><th>Impressions</th><th>Position moyenne</th></tr></thead><tbody>{observation.rows.slice(0, 50).map(row => <tr key={`${row.pageID}:${row.locale}:${row.device}:${row.date}`}><td className="p-2"><a href={`/admin/collections/pages/${row.pageID}`} className="underline">Page {row.pageID} · {row.locale}</a></td><td>{row.date}</td><td>{row.device}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table>{observation.rows.length > 50 && <p>50 premières lignes affichées ; totaux sur les {observation.rows.length} lignes conservées.</p>}</div> : <p>Aucune donnée Google disponible pour les pages publiées de cette période.</p>}</> : <p className="text-sm">Aucune synchronisation effectuée. Aucun chiffre de démonstration.</p>}
  </section>
}
