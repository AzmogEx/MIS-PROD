import Link from 'next/link'
import type { Payload, PayloadRequest } from 'payload'
import { hasRole } from '@/cms/access'

type EditablePage = {
  id: number | string
  title?: string | null
  path?: string | null
  _status?: 'draft' | 'published' | null
}

export async function Dashboard({ payload, user }: { payload: Payload; user: PayloadRequest['user'] }) {
  const edit = hasRole(user, ['owner', 'admin', 'editor'])
  const sales = hasRole(user, ['owner', 'admin', 'sales'])
  const manage = hasRole(user, ['owner', 'admin'])

  const result = edit
    ? await payload.find({ collection: 'pages', depth: 0, limit: 100, overrideAccess: false, user }).catch(() => null)
    : null
  const pages = [...(result?.docs ?? [])].sort((a, b) => Number(b.path === '/') - Number(a.path === '/')) as EditablePage[]

  return <section className="mis-dashboard" aria-labelledby="mis-dashboard-title">
    <header className="mis-dashboard-intro">
      <span className="mis-eyebrow">Votre espace MIS</span>
      <h2 id="mis-dashboard-title">Que voulez-vous faire aujourd’hui&nbsp;?</h2>
      <p>Modifiez votre site en quelques clics. Choisissez une page, changez un texte ou une photo, puis vérifiez le résultat avant de le publier.</p>
    </header>

    {edit && <section className="mis-dashboard-section" aria-labelledby="mis-pages-title">
      <div className="mis-dashboard-section-heading">
        <div>
          <span className="mis-step-label">ÉTAPE 1</span>
          <h3 id="mis-pages-title">Choisissez une page à modifier</h3>
        </div>
        <p>Cliquez sur la page, puis sur un texte ou une image dans l’aperçu.</p>
      </div>
      {result === null ? <p className="mis-dashboard-empty">La liste des pages n’est pas disponible pour le moment. Vous pouvez la retrouver dans « Plus d’outils ».</p> : pages.length > 0 ? <ul className="mis-page-list">
        {pages.map((page) => {
          const path = page.path || '/'
          const title = path === '/' ? 'Accueil' : page.title || path
          return <li key={page.id}>
            <Link className="mis-page-link" href={`/atelier/${encodeURIComponent(String(page.id))}?locale=fr`}>
              <span className="mis-page-title">{title}</span>
              <span className="mis-page-path">{path === '/' ? 'Page principale du site' : path}</span>
              <span className={`mis-page-status${page._status === 'draft' ? ' is-draft' : ''}`}>{page._status === 'draft' ? 'Brouillon' : 'Publié'}</span>
              <span className="mis-page-action">Modifier <span aria-hidden="true">→</span></span>
            </Link>
          </li>
        })}
      </ul> : <p className="mis-dashboard-empty">Aucune page n’est encore disponible. Ouvrez « Plus d’outils » pour gérer les pages.</p>}
    </section>}

    <section className="mis-dashboard-quick-actions" aria-label="Autres actions simples">
      {edit && <Link className="mis-quick-action" href="/admin/collections/media">
        <span className="mis-quick-action-title">Ajouter ou changer une photo</span>
        <span>Ouvrir les photos du site <span aria-hidden="true">→</span></span>
      </Link>}
      {sales && <Link className="mis-quick-action" href="/admin/collections/briefs">
        <span className="mis-quick-action-title">Lire les demandes reçues</span>
        <span>Voir les messages des visiteurs <span aria-hidden="true">→</span></span>
      </Link>}
      <Link className="mis-quick-action" href="/" target="_blank" rel="noreferrer">
        <span className="mis-quick-action-title">Voir le site public</span>
        <span>Ouvrir mis-prod.fr <span aria-hidden="true">↗</span></span>
      </Link>
    </section>

    {edit && <p className="mis-dashboard-help"><strong>À retenir :</strong> vos modifications restent en brouillon tant que vous n’avez pas cliqué sur « Publier sur le site ».</p>}

    <details className="mis-advanced-tools">
      <summary>Plus d’outils — pour l’équipe</summary>
      <div className="mis-advanced-groups">
        {edit && <section>
          <h3>Réglages du site</h3>
          <ul>
            <li><Link href="/admin/globals/site-content">Identité, textes et navigation</Link></li>
            <li><Link href="/admin/globals/ai-settings">Réglages de l’aide à la rédaction</Link></li>
            <li><Link href="/admin/collections/ai-requests">Suggestions de rédaction</Link></li>
            <li><Link href="/admin/collections/forms">Formulaires du site</Link></li>
            <li><Link href="/admin/collections/shared-sections">Sections partagées</Link></li>
            <li><Link href="/admin/collections/section-templates">Modèles de page</Link></li>
            <li><Link href="/admin/collections/redirects">Redirections</Link></li>
            <li><Link href="/admin/collections/publication-releases">Historique des publications</Link></li>
            <li><Link href="/medias">Fichiers et droits des médias</Link></li>
            <li><Link href="/controle">Vérifications du site</Link></li>
          </ul>
        </section>}
        {sales && <section>
          <h3>Demandes et clients</h3>
          <ul>
            <li><Link href="/gestion">Suivi des demandes et rappels</Link></li>
            <li><Link href="/admin/collections/tasks">Calendrier et rappels</Link></li>
            <li><Link href="/admin/collections/projects">Projets clients</Link></li>
            <li><Link href="/admin/collections/private-files">Fichiers clients</Link></li>
            <li><Link href="/admin/collections/deliverables">Versions de livrables</Link></li>
            <li><Link href="/admin/collections/video-comments">Commentaires clients</Link></li>
            <li><Link href="/admin/collections/approvals">Validations clients</Link></li>
            <li><Link href="/admin/collections/file-shares">Liens temporaires</Link></li>
            <li><Link href="/admin/collections/commercial-portfolios">Portfolios commerciaux</Link></li>
            <li><Link href="/admin/collections/analytics-events">Mesures du site</Link></li>
          </ul>
        </section>}
        <section>
          <h3>Autres accès</h3>
          <ul>
            <li><Link href="/espace-client">Espace client</Link></li>
            <li><Link href="/assistance">Aide à la rédaction</Link></li>
            <li><Link href="/securite">Sécurité et sessions</Link></li>
            <li>{manage ? <Link href="/admin/collections/users">Équipe et comptes</Link> : <Link href="/admin/account">Mon compte</Link>}</li>
            {manage && <li><Link href="/admin/collections/audit-log">Journal des actions</Link></li>}
          </ul>
        </section>
      </div>
    </details>
  </section>
}
