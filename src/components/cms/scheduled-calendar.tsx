import Link from 'next/link'
import type { ScheduledPublication } from '@/cms/calendar'

export function ScheduledCalendar({ data }: { data: { available: boolean; items: ScheduledPublication[]; total: number } }) {
  if (!data.available) return <p className="text-xs text-[#a6afa7]">La programmation éditoriale est réservée aux comptes disposant des droits sur les contenus.</p>
  return <section className="rounded-xl border border-white/10 bg-[#171b19] p-5">
    <h2 className="text-lg font-semibold">Publications programmées</h2>
    <p className="mt-2 text-xs text-[#a6afa7]">Source : file persistante des publications. Mois sélectionné et traitements antérieurs encore ouverts ; heures Europe/Paris.</p>
    {!data.items.length ? <p className="mt-5 text-sm text-[#b5bcb6]">Aucune publication programmée dans cette période.</p> : <ul className="mt-5 divide-y divide-white/10">{data.items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div><strong className="text-sm">{item.title}</strong><p className="mt-1 text-xs text-[#a6afa7]">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(item.dueAt))} · {item.action} · {{ scheduled: 'En attente', processing: 'En traitement', failed: 'Échec à examiner', completed: 'Terminée', unavailable: 'Contenu supprimé ou inaccessible' }[item.state]}</p></div>
      <div className="flex flex-wrap gap-4">{item.contentHref && <Link className="inline-flex min-h-11 items-center text-xs text-[#d5b575] underline underline-offset-4" href={item.contentHref}>Ouvrir le contenu</Link>}<Link className="inline-flex min-h-11 items-center text-xs text-[#d5b575] underline underline-offset-4" href={item.jobHref}>Voir le traitement</Link></div>
    </li>)}</ul>}
    {data.total > data.items.length && <p className="mt-3 text-xs text-[#a6afa7]">{data.items.length} traitements affichés sur {data.total}. Consultez la liste des traitements pour la suite.</p>}
  </section>
}
