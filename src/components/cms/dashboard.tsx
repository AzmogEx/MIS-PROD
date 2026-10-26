import Link from 'next/link'
import type { Payload, PayloadRequest } from 'payload'
import { hasRole } from '@/cms/access'

export async function Dashboard({ payload, user }: { payload: Payload; user: PayloadRequest['user'] }) {
  const req = { user }
  const sales = hasRole(req.user, ['owner', 'admin', 'sales'])
  const edit = hasRole(req.user, ['owner', 'admin', 'editor'])
  const counts = await Promise.all([
    sales ? payload.count({ collection: 'briefs', overrideAccess: false, user: req.user }) : null,
    edit ? payload.count({ collection: 'pages', where: { _status: { equals: 'draft' } }, overrideAccess: false, user: req.user }) : null,
    payload.count({ collection: 'tasks', where: { state: { equals: 'open' } }, overrideAccess: false, user: req.user }).catch(() => null),
  ])
  return <section className="mis-dashboard">
    <span className="mis-eyebrow">MIS · Espace de travail</span>
    <h2>Votre studio, aux commandes.</h2>
    <p>Retrouvez les contenus à publier, les demandes et les prochaines actions de l’équipe.</p>
    <div className="mis-cards">
      {sales && <Link className="mis-card" href="/admin/collections/briefs"><span>Demandes enregistrées</span><strong>{counts[0]?.totalDocs ?? 0}</strong><span>Ouvrir les dossiers →</span></Link>}
      {edit && <Link className="mis-card" href="/admin/collections/pages"><span>Pages en brouillon</span><strong>{counts[1]?.totalDocs ?? 0}</strong><span>Reprendre l’édition →</span></Link>}
      <Link className="mis-card" href="/admin/collections/tasks"><span>Actions à suivre</span><strong>{counts[2]?.totalDocs ?? '—'}</strong><span>Voir le calendrier →</span></Link>
    </div>
    <div className="mis-shortcuts">
      {edit && <><Link href="/admin/collections/pages/create">Créer une page</Link><Link href="/admin/globals/site-content">Identité et navigation</Link><Link href="/admin/collections/media">Médiathèque</Link></>}
      {sales && <Link href="/gestion">Demandes, calendrier et statistiques</Link>}
      {edit && <><Link href="/medias">Gérer les fichiers et leurs usages</Link><Link href="/controle">Contrôles et exploitation</Link></>}<Link href="/espace-client">Espace client</Link><Link href="/securite">Sécurité et sessions</Link><Link href="/assistance">Assistance IA locale</Link><Link href="/" target="_blank" rel="noreferrer">Voir le site ↗</Link>
    </div>
    <p className="mis-warning">Les contenus importés contiennent des références et chiffres à valider. Les emails restent en mode test tant que leur envoi réel n’est pas configuré et autorisé.</p>
    <small>Source : base MIS · Relevé {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date())}. Les compteurs sont limités à vos droits.</small>
  </section>
}
