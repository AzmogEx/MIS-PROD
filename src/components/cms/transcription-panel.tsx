'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Source = { collection: 'media' | 'private-files'; id: number; title: string; bytes: number; mimeType: string; private: boolean }
type State = { available: boolean; reason?: string; model?: string; maxBytes: number; maxSeconds: number; timeoutMs: number; convert: boolean; files: Source[]; hasNextPage: boolean }
export function TranscriptionPanel({ onComplete }: { onComplete: () => Promise<void> }) {
  const [state, setState] = useState<State | null>(null); const [search, setSearch] = useState(''); const [page, setPage] = useState(1)
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [result, setResult] = useState<{ id: number; output?: string; error?: string; status: string } | null>(null)
  const attempt = useRef<{ source: string; language: string; key: string } | null>(null)
  const load = useCallback(async (query: string, currentPage: number) => {
    try {
      const response = await fetch(`/api/client/transcription?search=${encodeURIComponent(query)}&page=${currentPage}`, { cache: 'no-store' }); const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setState(data); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Les fichiers ne sont pas disponibles.') }
  }, [])
  // The authenticated asynchronous response supplies initial state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load('', 1) }, [load])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    const form = new FormData(event.currentTarget); const [collection, id] = String(form.get('source')).split(':')
    const sourceKey = `${collection}:${id}`; const language = String(form.get('language'))
    if (attempt.current?.source !== sourceKey || attempt.current.language !== language) attempt.current = { source: sourceKey, language, key: crypto.randomUUID() }
    try {
      const response = await fetch('/api/client/transcription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection, id: Number(id), language, requestKey: attempt.current.key }) }); const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (data.status !== 'pending') attempt.current = null
      setResult(data); await onComplete()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'La transcription est indisponible. Consultez les demandes enregistrées avant de recommencer.') }
    finally { setBusy(false) }
  }
  return <section className="portal-card" style={{ marginTop: 28 }} aria-label="Transcription locale">
    <h2>Transcrire un fichier autorisé</h2>
    <p className="portal-prose" style={{ marginTop: 12 }}>Le résultat est une suggestion privée à relire. Le fichier, sa transcription éditoriale et ses sous-titres restent inchangés.</p>
    {error && <p className="portal-error" role="alert">{error}</p>}
    {state && <>
      <p className="portal-muted" style={{ marginTop: 12 }}>{state.available ? `whisper.cpp local · modèle déclaré ${state.model}` : state.reason}</p>
      <p className="portal-muted">Limite : {Math.round(state.maxBytes / 1048576)} Mio ; traitement des {state.maxSeconds} premières secondes au maximum. {state.convert ? 'WAV PCM, MP3, MP4 et WebM : conversion activée sur le serveur local.' : 'WAV PCM 16 bits à 16 kHz uniquement. La conversion des autres formats est désactivée.'} Aucune relance automatique après interruption.</p>
      <form className="portal-login-form" style={{ marginTop: 20 }} onSubmit={event => { event.preventDefault(); setPage(1); void load(search, 1) }}><label>Rechercher parmi vos fichiers accessibles<input value={search} onChange={event => setSearch(event.target.value)} maxLength={120} /></label><button type="submit" className="portal-button" disabled={busy}>Rechercher</button></form>
      <form className="portal-login-form" style={{ marginTop: 20 }} onSubmit={submit}>
        <label>Fichier source<select key={`${page}:${state.files.map(file => `${file.collection}:${file.id}`).join(',')}`} name="source" required disabled={busy || !state.files.length} style={{ padding: 12, minHeight: 48, background: '#101113', color: '#f5f3ee' }}>{state.files.map(file => <option key={`${file.collection}:${file.id}`} value={`${file.collection}:${file.id}`}>{file.private ? 'Privé' : 'Médiathèque'} · {file.title} · {(file.bytes / 1048576).toFixed(1)} Mio</option>)}</select></label>
        {!state.files.length && <p className="portal-muted">Aucun fichier compatible dans cette sélection. Ajoutez un fichier autorisé dans la médiathèque ou les fichiers privés du projet.</p>}
        <label>Langue parlée<select name="language" defaultValue="fr" disabled={busy} style={{ padding: 12, minHeight: 48, background: '#101113', color: '#f5f3ee' }}><option value="fr">Français</option><option value="en">Anglais</option><option value="auto">Détection automatique</option></select></label>
        <button className="portal-button primary" disabled={busy || !state.available || !state.files.length}>{busy ? 'Transcription locale en cours…' : 'Préparer la transcription'}</button>
      </form>
      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}><button className="portal-button" disabled={busy || page === 1} onClick={() => { setPage(page - 1); void load(search, page - 1) }}>Fichiers précédents</button><button className="portal-button" disabled={busy || !state.hasNextPage} onClick={() => { setPage(page + 1); void load(search, page + 1) }}>Fichiers suivants</button></div>
    </>}
    {result && <div role="status" style={{ marginTop: 24 }}><h3>{result.status === 'completed' ? 'Transcription à relire' : result.status === 'failed' ? 'Traitement interrompu' : 'Demande déjà réservée'}</h3><p className="portal-prose" style={{ whiteSpace: 'pre-wrap' }}>{result.output || result.error || 'Consultez la demande enregistrée. Aucune relance automatique.'}</p><Link href={`/admin/collections/ai-requests/${result.id}`} className="portal-button">Ouvrir la suggestion enregistrée</Link></div>}
  </section>
}
