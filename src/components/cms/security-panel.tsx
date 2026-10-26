'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Check, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'

type SecurityState = { enabled: boolean; pending: boolean; recoveryRemaining: number; sessions: { id: string; createdAt: string; expiresAt: string; current: boolean }[] }
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function SecurityPanel() {
  const [state, setState] = useState<SecurityState | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [reconnect, setReconnect] = useState(false)
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/security', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setState(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sécurité indisponible.') }
  }, [])
  // Initial authenticated network read; updates follow the asynchronous service response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  const action = async (name: string, sessionID?: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, password, code, sessionID }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      if (result.secret) setSetup({ secret: result.secret, uri: result.uri })
      if (result.recoveryCodes) { setRecoveryCodes(result.recoveryCodes); setSetup(null) }
      if (result.reconnect) { setReconnect(true); setPassword(''); setCode('') }
      else { if (!result.secret) setCode(''); await load() }
      setNotice(name === 'confirm' ? 'Double authentification activée. Toutes les sessions ont été révoquées. Conservez vos codes avant de vous reconnecter.' : name === 'disable' ? 'Double authentification désactivée. Toutes les sessions ont été révoquées.' : name === 'enroll' ? 'Ajoutez la clé dans votre application puis vérifiez le premier code.' : 'Les sessions sélectionnées sont révoquées.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Opération impossible.') }
    finally { setBusy(false) }
  }
  return <main className="mis-portal"><header className="portal-header"><Link href="/admin" className="portal-brand">MIS<span>SÉCURITÉ DU COMPTE</span></Link><Link href="/espace-client" className="portal-button">Mon espace</Link></header><div className="portal-workspace" style={{ maxWidth: 850 }}><p className="portal-eyebrow">ACCÈS PERSONNEL</p><h1>Votre compte,<br /><em>mieux protégé.</em></h1><p className="portal-prose" style={{ margin: '20px 0 30px' }}>Ajoutez un code temporaire à votre mot de passe et contrôlez les sessions ouvertes. La clé d’activation et les codes de récupération ne sont jamais envoyés par email.</p>{error && <p className="portal-error" role="alert">{error} {!state && <Link href="/connexion">Se connecter</Link>}</p>}{notice && <p className="portal-success" role="status">{notice}</p>}
    {recoveryCodes.length > 0 && <section className="portal-card" style={{ margin: '25px 0' }}><h2><KeyRound size={24} /> Vos codes de récupération</h2><p className="portal-prose">Ils ne seront affichés qu’une fois. Enregistrez-les dans votre gestionnaire de mots de passe ou imprimez-les dans un lieu sûr. Chaque code remplace un code temporaire une seule fois ; le mot de passe reste nécessaire.</p><pre style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.9, color: '#d8bb7b', marginTop: 20, userSelect: 'all' }}>{recoveryCodes.join('\n')}</pre></section>}
    {reconnect ? <Link className="portal-button primary" href="/connexion" style={{ marginTop: 25 }}>J’ai conservé mes codes — me reconnecter</Link> : state && <><section className="portal-card" style={{ marginTop: 25 }}><h2><ShieldCheck size={24} /> Double authentification {state.enabled ? 'active' : 'inactive'}</h2>{state.enabled && <p className="portal-muted">{state.recoveryRemaining} code(s) de récupération restant(s).</p>}<div className="portal-login-form" style={{ padding: 0, marginTop: 20, border: 0 }}><label>Confirmez votre mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>{(state.enabled || setup) && <label>Code de l’application ou code de récupération<input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" maxLength={40} /></label>}{setup ? <><div className="portal-share"><p className="portal-prose">Dans votre application d’authentification, ajoutez une clé de configuration de type « basée sur le temps ». Nom du compte : MIS. Validité de cette activation : 15 minutes.</p><label style={{ marginTop: 15 }}>Clé personnelle<input readOnly value={setup.secret} onFocus={(event) => event.target.select()} /></label><a href={setup.uri} className="portal-button" style={{ marginTop: 15 }}>Ouvrir dans une application d’authentification</a></div><button className="portal-button primary" disabled={busy || !password || !code} onClick={() => action('confirm')}><Check size={16} /> Confirmer l’activation</button></> : state.enabled ? <button className="portal-button" disabled={busy || !password || !code} onClick={() => action('disable')}>Désactiver et fermer toutes les sessions</button> : <button className="portal-button primary" disabled={busy || !password} onClick={() => action('enroll')}><LockKeyhole size={16} /> Préparer l’activation</button>}</div></section>
      <section className="portal-card" style={{ marginTop: 25 }}><h2>Sessions ouvertes</h2><p className="portal-prose">Une révocation prend effet au prochain accès serveur. La liste ne déduit aucun appareil ou lieu à partir d’informations absentes.</p><div className="portal-documents">{state.sessions.map((session) => <article key={session.id}><div><h4>{session.current ? 'Cette session' : 'Autre session'}</h4><small>Ouverte le {date(session.createdAt)}<br />Expire le {date(session.expiresAt)}</small></div><button className="portal-button" disabled={busy || !password || (state.enabled && !code)} onClick={() => action('revoke-session', session.id)}>Révoquer</button></article>)}</div><button className="portal-button" style={{ marginTop: 20 }} disabled={busy || !password || (state.enabled && !code)} onClick={() => action('revoke-others')}>Fermer les autres sessions</button></section><p className="portal-muted" style={{ marginTop: 20 }}>Si votre mot de passe et vos codes de récupération sont perdus, le propriétaire MIS doit organiser une récupération contrôlée. Une réinitialisation automatique du mot de passe est bloquée pour les comptes protégés.</p></>}
    </div></main>
}

export function SecureLogin() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password'), code: data.get('code') }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || 'Connexion refusée. Vérifiez le mot de passe et votre code de vérification.')
      window.location.assign(['owner', 'admin', 'editor', 'sales', 'contributor'].includes(result.user?.role) ? '/admin' : '/espace-client')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Connexion momentanément indisponible.') }
    finally { setBusy(false) }
  }
  return <main className="mis-portal"><header className="portal-header"><Link href="/" className="portal-brand">MIS<span>MÉMOIRE · IMAGE · SON</span></Link><span className="portal-security"><LockKeyhole size={15} /> Connexion sécurisée</span></header><section className="portal-login"><div className="portal-login-intro"><p className="portal-eyebrow">COMPTE MIS</p><h1>Votre espace.<br /><em>Votre accès.</em></h1><p>Utilisez votre mot de passe et, si vous l’avez activée, votre double authentification. Un code temporaire ne peut servir qu’une fois.</p></div><form className="portal-login-form" onSubmit={submit}><ShieldCheck size={26} /><h2>Se connecter</h2><label>Email<input type="email" name="email" autoComplete="username" required /></label><label>Mot de passe<input type="password" name="password" autoComplete="current-password" required /></label><label>Code de vérification — si activé<input name="code" autoComplete="one-time-code" maxLength={40} placeholder="6 chiffres ou code de récupération" /></label>{error && <p className="portal-error" role="alert">{error}</p>}<button className="portal-button primary" disabled={busy}>{busy ? 'Vérification…' : 'Se connecter'}</button><p className="portal-muted">Si vous venez d’activer la double authentification, attendez le prochain code de 30 secondes ou utilisez un code de récupération.</p></form></section></main>
}
