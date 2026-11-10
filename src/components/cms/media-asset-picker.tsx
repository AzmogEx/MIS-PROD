'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Asset = { id: number; filename: string; alt?: string; url?: string; mimeType?: string; visibility?: string; rightsUntil?: string }
export function MediaAssetPicker({ value, onChange, label, kind, disabled = false, editorPath }: { value: string; onChange: (url: string) => void; label: string; kind: string; disabled?: boolean; editorPath?: string }) {
  const id = useId(); const [files, setFiles] = useState<Asset[]>([]); const [opened, setOpened] = useState(false); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [next, setNext] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = async (current = 1) => {
    setBusy(true); setError(''); setOpened(true)
    try {
      const mimes = kind === 'appleIcon' ? ['image/png', 'image/jpeg'] : kind === 'shareImage' ? ['image/png', 'image/jpeg', 'image/webp'] : ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
      const query = new URLSearchParams({ limit: '30', depth: '0', sort: '-createdAt', page: String(current), 'where[mimeType][in]': mimes.join(','), 'where[visibility][equals]': 'public' })
      if (search.trim()) query.set('where[filename][like]', search.trim())
      const response = await fetch(`/api/media?${query}`, { cache: 'no-store' }); const body = await response.json()
      if (!response.ok) throw new Error('La médiathèque n’est pas accessible. Vérifiez votre session.')
      setFiles((body.docs as Asset[]).filter(file => !file.rightsUntil || Date.parse(file.rightsUntil) > Date.now())); setPage(current); setNext(Boolean(body.hasNextPage))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Lecture impossible.') }
    finally { setBusy(false) }
  }
  return <div className="field-type text mis-editor-media-picker" style={{ marginBlock: 12 }}>
    <span className="mis-editor-media-label">{label}</span>
    {value ? <Image unoptimized width={1200} height={800} src={value} alt={`Aperçu de ${label}`} /> : <p>Aucune image choisie.</p>}
    <div className="mis-editor-media-actions"><button type="button" data-editor-path={editorPath} disabled={disabled || busy} onClick={() => void load()}>{busy ? 'Chargement…' : value ? 'Changer l’image' : 'Choisir une image'}</button><Link href="/medias" target="_blank" rel="noreferrer">Importer une image ↗</Link></div>
    <details className="mis-editor-image-url"><summary>Options avancées</summary><label htmlFor={id}>Adresse de l’image</label><input id={id} value={value || ''} onChange={event => onChange(event.target.value)} disabled={disabled} style={{ width: '100%', minHeight: 44 }} /></details>
    {opened && <div className="mis-editor-media-library"><label htmlFor={`${id}-search`}>Rechercher une image</label><input id={`${id}-search`} value={search} maxLength={120} onChange={event => setSearch(event.target.value)} disabled={disabled || busy} style={{ width: '100%', minHeight: 44 }} /><button type="button" onClick={() => void load()} disabled={disabled || busy}>Rechercher</button><label htmlFor={`${id}-choice`}>Image disponible</label><select id={`${id}-choice`} value={files.some(file => file.url === value) ? value : ''} onChange={event => { if (event.target.value) onChange(event.target.value) }} disabled={disabled || busy} style={{ width: '100%', minHeight: 44 }}><option value="">Choisir une image…</option>{files.filter(file => file.url).map(file => <option key={file.id} value={file.url}>{file.alt || file.filename} · {file.filename}</option>)}</select><div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={disabled || busy || page === 1} onClick={() => void load(page - 1)}>Précédentes</button><button type="button" disabled={disabled || busy || !next} onClick={() => void load(page + 1)}>Suivantes</button></div><p>Seules les images publiques avec des droits valides sont proposées.</p></div>}
    {error && <p role="alert">{error}</p>}
  </div>
}
