'use client'

import { TranscriptionPanel } from './transcription-panel'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ChevronRight, Download, FileText, Film, FolderOpen, LockKeyhole, LogOut, MessageSquare, Share2 } from 'lucide-react'

type ID = number | string
type Project = { id: ID; title: string; description?: string; status: string; dueAt?: string }
type Delivery = { id: ID; title: string; project: ID; version: string; file: ID; duration?: number; note?: string; clientVisible: boolean }
type Comment = { id: ID; deliverable: ID; author: ID; body: string; timecode?: number; recordedAt: string }
type Approval = { id: ID; deliverable: ID; author: ID; decision: string; note?: string; recordedAt: string }
type FileInfo = { id: ID; mimeType?: string; title?: string; available: boolean }
type Document = FileInfo & { project: ID; kind: string }
type Portfolio = { id: ID; title: string; introduction?: string; expiresAt: string; items: { title: string; context?: string; url?: string; mimeType?: string; alt?: string }[] }
type Workspace = { user: { id: ID; email: string; staff: boolean }; projects: Project[]; deliveries: Delivery[]; comments: Comment[]; approvals: Approval[]; files: FileInfo[]; documents: Document[]; portfolios: Portfolio[] }

const labels: Record<string, string> = { preparation: 'Préparation', production: 'En production', review: 'À valider', delivered: 'Livré', quote: 'Devis', invoice: 'Facture', contract: 'Contrat', document: 'Document', delivery: 'Livrable' }
const same = (a: ID, b: ID) => String(a) === String(b)
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(value))
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`

export function ClientPortal() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projectID, setProjectID] = useState<ID | null>(null)
  const [tab, setTab] = useState<'projects' | 'portfolios'>('projects')
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/client', { cache: 'no-store' })
      if (response.status === 401) { setWorkspace(null); return }
      if (!response.ok) throw new Error('Vos projets ne peuvent pas être chargés pour le moment.')
      const data = await response.json() as Workspace
      setWorkspace(data)
      setProjectID((current) => current && data.projects.some((project) => same(current, project.id)) ? current : data.projects[0]?.id ?? null)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Service indisponible.') }
    finally { setLoading(false) }
  }, [])
  // This effect performs an authenticated network read; all state changes follow its asynchronous response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  const logout = async () => {
    const response = await fetch('/api/users/logout', { method: 'POST' })
    if (response.ok) { setWorkspace(null); setProjectID(null) } else setError('La déconnexion a échoué. Réessayez.')
  }
  const project = workspace?.projects.find((item) => projectID !== null && same(item.id, projectID))

  return <main className="mis-portal">
    <header className="portal-header">
      <Link href="/" className="portal-brand" aria-label="MIS — Retour au site">MIS<span>MÉMOIRE · IMAGE · SON</span></Link>
      <div className="portal-header-right"><Link href="/securite" className="portal-security"><LockKeyhole size={14} /> Sécurité du compte</Link>{workspace && <button className="portal-icon-button" onClick={logout} aria-label="Se déconnecter"><LogOut size={18} /></button>}</div>
    </header>
    {loading ? <div className="portal-loading" role="status">Chargement de votre espace…</div> : workspace ? <div className="portal-workspace">
      <div className="portal-welcome"><p className="portal-eyebrow">VOTRE ESPACE MIS</p><h1>Des projets. <em>Un dialogue.</em></h1><p>Retrouvez vos films, vos documents et chaque étape de validation.</p></div>
      {error && <p className="portal-error" role="alert">{error} <button onClick={load}>Réessayer</button></p>}
      <nav className="portal-tabs" aria-label="Rubriques de l’espace client"><button aria-current={tab === 'projects' ? 'page' : undefined} onClick={() => setTab('projects')}><FolderOpen size={17} /> Mes projets <span>{workspace.projects.length}</span></button><button aria-current={tab === 'portfolios' ? 'page' : undefined} onClick={() => setTab('portfolios')}><Film size={17} /> Sélections privées <span>{workspace.portfolios.length}</span></button></nav>
      {tab === 'portfolios' ? <section className="portal-portfolios" aria-label="Sélections privées">
        {workspace.portfolios.length === 0 && <Empty title="Aucune sélection partagée" description="Les portfolios préparés pour vous apparaîtront ici jusqu’à leur date d’expiration." />}
        {workspace.portfolios.map((portfolio) => <article className="portal-card" key={portfolio.id}><p className="portal-eyebrow">SÉLECTION PRIVÉE · JUSQU’AU {date(portfolio.expiresAt)}</p><h2>{portfolio.title}</h2><p className="portal-prose">{portfolio.introduction}</p><div className="portal-portfolio-grid">{portfolio.items.map((item, index) => <figure key={index}>{item.url && (item.mimeType?.startsWith('video/') ? <video src={item.url} controls preload="metadata" /> : item.mimeType?.startsWith('image/') ? <Image src={item.url} alt={item.alt || item.title} width={1000} height={563} unoptimized /> : <a href={item.url}>Ouvrir le média</a>)}<figcaption><h3>{item.title}</h3><p>{item.context}</p></figcaption></figure>)}</div>{!portfolio.items.length && <p className="portal-muted">Aucun média disponible avec des droits de diffusion valides.</p>}</article>)}
      </section> : <div className="portal-project-layout">
        <aside className="portal-project-list" aria-label="Vos projets">{workspace.projects.map((item) => <button key={item.id} onClick={() => setProjectID(item.id)} aria-current={projectID !== null && same(item.id, projectID) ? 'page' : undefined}><span><small>{labels[item.status] || item.status}</small><strong>{item.title}</strong></span><ChevronRight size={17} /></button>)}</aside>
        <section className="portal-project-detail" aria-label="Détail du projet">{project ? <><div className="portal-project-heading"><div><p className="portal-eyebrow">{labels[project.status] || project.status}</p><h2>{project.title}</h2></div>{project.dueAt && <p className="portal-due">Échéance<br /><strong>{date(project.dueAt)}</strong></p>}</div><p className="portal-prose">{project.description}</p>
          <h3 className="portal-section-title"><Film size={18} /> Versions de livrables</h3>
          {workspace.deliveries.filter((item) => same(item.project, project.id)).length === 0 && <Empty title="Le prochain film se prépare" description="Votre équipe MIS partagera ici les versions prêtes à être visionnées." />}
          {workspace.deliveries.filter((item) => same(item.project, project.id)).map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} file={workspace.files.find((item) => same(item.id, delivery.file))} comments={workspace.comments.filter((item) => same(item.deliverable, delivery.id))} approvals={workspace.approvals.filter((item) => same(item.deliverable, delivery.id))} user={workspace.user} reload={load} />)}
          <h3 className="portal-section-title"><FileText size={18} /> Documents</h3><div className="portal-documents">{workspace.documents.filter((item) => same(item.project, project.id)).map((document) => <article key={document.id}><FileText size={22} /><div><small>{labels[document.kind] || 'Document'}</small><h4>{document.title}</h4></div>{document.available ? <a href={`/api/client/files/${document.id}`} aria-label={`Télécharger ${document.title}`}><Download size={18} /> Télécharger</a> : <span className="portal-muted">Accès expiré</span>}</article>)}{!workspace.documents.some((item) => same(item.project, project.id)) && <p className="portal-muted">Aucun document partagé pour ce projet.</p>}</div>
        </> : <Empty title="Bienvenue dans votre espace" description="Aucun projet ne vous est encore attribué. L’équipe MIS vous donnera accès à vos projets depuis votre compte." />}</section>
      </div>}
    </div> : <Login onLogin={load} error={error} />}
    <footer className="portal-footer"><span>MIS · Mémoire Image Son</span><span>Vos échanges restent liés à la version concernée.</span></footer>
  </main>
}

function Empty({ title, description }: { title: string; description: string }) {
  return <div className="portal-empty"><FolderOpen size={28} strokeWidth={1} /><h3>{title}</h3><p>{description}</p></div>
}

function Login({ onLogin, error: globalError }: { onLogin: () => Promise<void>; error: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), code: form.get('code') }) })
      if (!response.ok) throw new Error('Connexion refusée. Vérifiez votre email et votre mot de passe.')
      await onLogin()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Connexion momentanément indisponible.') }
    finally { setBusy(false) }
  }
  return <section className="portal-login"><div className="portal-login-intro"><p className="portal-eyebrow">L’IMAGE SE CONSTRUIT ENSEMBLE</p><h1>Votre projet,<br /><em>en confiance.</em></h1><p>Un espace commun pour visionner vos films, préciser vos retours et valider chaque version.</p><span className="portal-login-line" /><p className="portal-muted">L’accès est personnel. Utilisez le compte transmis par votre interlocuteur MIS.</p></div><form className="portal-login-form" onSubmit={submit}><LockKeyhole size={25} strokeWidth={1.3} /><h2>Se connecter</h2><label>Email<input name="email" type="email" required autoComplete="username" /></label><label>Mot de passe<input name="password" type="password" required autoComplete="current-password" /></label><label>Code de vérification (si activé)<input name="code" autoComplete="one-time-code" maxLength={40} placeholder="Code temporaire ou code de récupération" /></label>{(error || globalError) && <p role="alert" className="portal-error">{error || globalError}</p>}<button className="portal-button primary" disabled={busy}>{busy ? 'Connexion…' : 'Accéder à mon espace'}<ChevronRight size={17} /></button><p className="portal-muted">Mot de passe oublié ? Contactez votre interlocuteur MIS pour une récupération sécurisée.</p></form></section>
}

function DeliveryCard({ delivery, file, comments, approvals, user, reload }: { delivery: Delivery; file?: FileInfo; comments: Comment[]; approvals: Approval[]; user: Workspace['user']; reload: () => Promise<void> }) {
  const video = useRef<HTMLVideoElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timecode, setTimecode] = useState('')
  const [share, setShare] = useState('')
  const post = async (body: Record<string, unknown>) => {
    setBusy(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, deliverable: delivery.id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Enregistrement impossible.')
      await reload(); setSuccess(body.action === 'comment' ? 'Commentaire enregistré.' : 'Votre décision est enregistrée pour cette version.'); return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); return false }
    finally { setBusy(false) }
  }
  const comment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (await post({ action: 'comment', body: data.get('body'), timecode: timecode === '' ? undefined : Number(timecode) })) { form.reset(); setTimecode('') }
  }
  const makeShare = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/client/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: delivery.file, hours: 24 }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setShare(result.url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Partage indisponible.') }
    finally { setBusy(false) }
  }
  const accepted = approvals.some((approval) => approval.decision === 'accepted' && same(approval.author, user.id))
  return <article className="portal-delivery"><header><div><span className="portal-version">{delivery.version}</span><h4>{delivery.title}</h4></div>{file?.available && <a className="portal-icon-button" href={`/api/client/files/${delivery.file}`} aria-label={`Télécharger ${delivery.title}, ${delivery.version}`}><Download size={18} /></a>}</header><p className="portal-prose">{delivery.note}</p>
    {file?.available ? file.mimeType?.startsWith('video/') ? <video ref={video} controls preload="metadata" src={`/api/client/files/${delivery.file}`} aria-label={`${delivery.title}, ${delivery.version}`} /> : <a className="portal-document-link" href={`/api/client/files/${delivery.file}`}><FileText size={24} /> Ouvrir le document de cette version <ChevronRight size={18} /></a> : <p className="portal-muted">Ce fichier n’est plus disponible au téléchargement.</p>}
    <div className="portal-review-actions"><button className="portal-button primary" disabled={busy || accepted || !file?.available} onClick={() => post({ action: 'approve', decision: 'accepted' })}><Check size={16} />{accepted ? 'Version validée' : `Valider ${delivery.version}`}</button><button className="portal-button" disabled={busy} onClick={() => post({ action: 'approve', decision: 'changes_requested' })}>Demander des modifications</button>{user.staff && file?.available && <button className="portal-button" disabled={busy} onClick={makeShare}><Share2 size={15} /> Lien 24 h</button>}</div>
    {share && <div className="portal-share"><label>Lien temporaire — visible jusqu’à expiration ou révocation<input readOnly value={share} onFocus={(event) => event.target.select()} /></label><Link href="/admin/collections/file-shares">Gérer ou révoquer les liens</Link></div>}
    {approvals.length > 0 && <ul className="portal-approvals">{approvals.map((approval) => <li key={approval.id}><Check size={13} /><span>{approval.decision === 'accepted' ? 'Acceptation' : 'Modifications demandées'} · {same(approval.author, user.id) ? 'Vous' : 'Membre du projet'} · {date(approval.recordedAt)}</span></li>)}</ul>}
    <details className="portal-discussion" open={comments.length > 0}><summary><MessageSquare size={16} /> Échanges sur {delivery.version} <span>{comments.length}</span></summary><ol>{comments.map((item) => <li key={item.id}><div><strong>{same(item.author, user.id) ? 'Vous' : 'Membre du projet'}</strong><time dateTime={item.recordedAt}>{date(item.recordedAt)}</time>{item.timecode != null && <button onClick={() => { if (video.current) { video.current.currentTime = item.timecode!; video.current.focus() } }}>{time(item.timecode)}</button>}</div><p>{item.body}</p></li>)}</ol><form onSubmit={comment}><label htmlFor={`comment-${delivery.id}`}>Votre retour sur cette version<textarea id={`comment-${delivery.id}`} name="body" required maxLength={5000} rows={3} /></label>{file?.mimeType?.startsWith('video/') && <div className="portal-timecode"><label>Repère (secondes)<input type="number" min={0} max={delivery.duration || 86400} step="0.1" value={timecode} onChange={(event) => setTimecode(event.target.value)} /></label><button className="portal-button" type="button" onClick={() => setTimecode(String(Math.round((video.current?.currentTime || 0) * 10) / 10))}>Utiliser la position du lecteur</button></div>}<button className="portal-button" disabled={busy}>{busy ? 'Enregistrement…' : 'Ajouter mon commentaire'}</button></form></details>
    {error && <p role="alert" className="portal-error">{error}</p>}{success && <p role="status" className="portal-success">{success}</p>}
  </article>
}

type AIState = { available: boolean; reason?: string; provider: string; model?: string; maxInputCharacters: number; tasks: { label: string; value: string }[]; requests: { id: ID; task: string; status: string; output?: string; error?: string; createdAt: string }[]; transcription: { available: boolean; reason?: string }; externalProvider: { reason: string } }
export function AIAssistant() {
  const [state, setState] = useState<AIState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ output?: string; error?: string; status?: string } | null>(null)
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/client/ai', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setState(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Assistance indisponible.') }
  }, [])
  // This effect performs an authenticated network read; all state changes follow its asynchronous response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/client/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: data.get('task'), text: data.get('text'), language: data.get('language'), requestKey: crypto.randomUUID() }) })
      const content = await response.json()
      if (!response.ok) throw new Error(content.error)
      setResult(content); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Génération impossible.') }
    finally { setBusy(false) }
  }
  return <main className="mis-portal"><header className="portal-header"><Link href="/admin" className="portal-brand">MIS<span>ADMINISTRATION</span></Link><Link href="/admin/globals/ai-settings" className="portal-button">Paramètres IA</Link></header><div className="portal-workspace"><p className="portal-eyebrow">ASSISTANCE ÉDITORIALE · MODÈLE LOCAL</p><h1>Préparer. <em>Relire. Décider.</em></h1><p className="portal-prose" style={{ marginTop: 20, marginBottom: 30 }}>Les suggestions restent des brouillons. Aucun texte n’est publié et aucune réponse client n’est envoyée automatiquement.</p>{error && <p className="portal-error" role="alert">{error}</p>}{state && <><div className="portal-card" style={{ marginBottom: 25 }}><h2>{state.available ? 'Prêt à préparer un brouillon' : 'Configuration nécessaire'}</h2><p className="portal-prose">{state.available ? `${state.provider} · ${state.model}` : state.reason}</p><p className="portal-muted" style={{ marginTop: 12 }}>{state.externalProvider.reason}</p></div><div className="portal-project-layout" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,350px),1fr))' }}><form className="portal-login-form" onSubmit={submit}><label>Préparer<select name="task" style={{ padding: 12, minHeight: 48, background: '#101113', color: '#f5f3ee', border: '1px solid #45464c', borderRadius: 6 }}>{state.tasks.filter(task => task.value !== 'transcription').map((task) => <option key={task.value} value={task.value}>{task.label}</option>)}</select></label><label>Langue souhaitée<input name="language" defaultValue="français" maxLength={60} /></label><label>Données de référence autorisées<textarea name="text" rows={9} required maxLength={state.maxInputCharacters} placeholder="Renseignez les faits utiles. Le modèle ne doit pas inventer les informations manquantes." /></label><button className="portal-button primary" disabled={!state.available || busy}>{busy ? 'Préparation du brouillon…' : 'Préparer une suggestion locale'}</button></form><section className="portal-card" aria-label="Suggestion"><h2>À relire par l’équipe</h2>{result ? <><p className="portal-prose">{result.output || result.error || 'Traitement réservé. Consultez l’historique pour suivre son état.'}</p>{result.output && <button className="portal-button" style={{ marginTop: 20 }} onClick={async () => { try { await navigator.clipboard.writeText(result.output!); setError('') } catch { setError('Sélectionnez le texte pour le copier manuellement.') } }}>Copier le brouillon</button>}</> : <p className="portal-muted">Votre suggestion apparaîtra ici. Vérifiez les faits, les noms, les droits et le ton avant utilisation.</p>}</section></div><TranscriptionPanel onComplete={load} /><h2 className="portal-section-title">Vos dernières suggestions</h2>{state.requests.length ? state.requests.map((request) => <details key={request.id} className="portal-card" style={{ marginBottom: 12 }}><summary>{state.tasks.find((task) => task.value === request.task)?.label} · {date(request.createdAt)} · {request.status === 'completed' ? 'À relire' : request.status === 'failed' ? 'Échec' : 'En attente'}</summary><p className="portal-prose" style={{ marginTop: 20 }}>{request.output || request.error || 'Aucune reprise automatique : une opération interrompue reste réservée.'}</p></details>) : <p className="portal-muted">Aucune suggestion enregistrée.</p>}</>}</div></main>
}
