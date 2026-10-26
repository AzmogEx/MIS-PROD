/* eslint-disable @next/next/no-img-element */
"use client";

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, File, Film, Image as ImageIcon, Music, Upload, X } from 'lucide-react'
import type { LibraryMedia, MediaUsage } from '@/cms/media-services'
import type { MediaImportStatus } from '@/cms/media-imports'
import { uploadFileResumable as uploadFile } from './resumable-upload'
import { ImageImportEditor } from './image-import-editor'
import type { ImageImportEdits } from '@/cms/media-image-edits'

type Storage = { available: boolean; bytes?: number; files?: number; observedAt: string; maxFileBytes: number; maxStorageBytes: number; reason?: string }
type Listing = { docs: LibraryMedia[]; totalDocs: number; page: number; totalPages: number; storage: Storage }
type Usages = { media: LibraryMedia; usages: MediaUsage[]; fingerprint: string; checkedAt: string; scope: string }
type UploadRow = { name: string; progress: number; state: 'pending' | 'uploading' | 'processing' | 'done' | 'error'; error?: string }
const bytes = (value = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / (value >= 1024 ** 3 ? 1024 ** 3 : value >= 1024 ** 2 ? 1024 ** 2 : 1024)) + (value >= 1024 ** 3 ? ' Go' : value >= 1024 ** 2 ? ' Mo' : ' Ko')
const date = (value?: string) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(value)) : '—'
const dateInput = (value?: string | null) => value ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(value)) : ''
const usageLabels: Record<MediaUsage['kind'], string> = { draft: 'Brouillon', public: 'Version publique', version: 'Historique', release: 'Publication figée', dependency: 'Dépendance média', template: 'Modèle indépendant' }
const acceptedTypes = '.jpg,.jpeg,.png,.webp,.avif,.svg,.ico,.mp4,.webm,.mp3,.vtt,.pdf'

async function jsonResponse(response: Response) {
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || result.errors?.[0]?.message || 'L’opération n’a pas abouti.')
  return result
}

export function MediaLibrary() {
  const [params, setParams] = useState({ q: '', collection: '', tag: '', type: '', page: 1 })
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [selectedIDs, setSelectedIDs] = useState<string[]>([])
  const [active, setActive] = useState<LibraryMedia | null>(null)
  const [usages, setUsages] = useState<Usages | null>(null)
  const [replacementID, setReplacementID] = useState('')
  const [replacementImported, setReplacementImported] = useState<LibraryMedia | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [uploadCollection, setUploadCollection] = useState('')
  const [pendingImports, setPendingImports] = useState<MediaImportStatus[]>([])
  const [resumeMaxBytes, setResumeMaxBytes] = useState<number | null>(null)
  const [configureImages, setConfigureImages] = useState(false)
  const [imageDraft, setImageDraft] = useState<{ file: globalThis.File; resolve: (edits: ImageImportEdits | null) => void } | null>(null)
  const uploadImageEdits = useRef<Record<number, ImageImportEdits | undefined>>({})
  const uploadFiles = useRef<globalThis.File[]>([])
  const [bulkCollection, setBulkCollection] = useState('')
  const [bulkTags, setBulkTags] = useState('')
  const activeID = active?.id
  const isImage = (file: globalThis.File) => /\.(?:jpe?g|png|webp|avif)$/i.test(file.name)
  const chooseImageEdits = (file: globalThis.File) => new Promise<ImageImportEdits | null>(resolve => setImageDraft({ file, resolve }))

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ ...params, page: String(params.page) })
      const result = await jsonResponse(await fetch(`/api/media-tools?${query}`, { signal })) as Listing
      setListing(result)
      const transfers = await jsonResponse(await fetch('/api/media-imports', { signal })) as { imports: MediaImportStatus[]; limits: { maxFileBytes: number } }
      setPendingImports(transfers.imports.filter(item => item.status !== 'complete'))
      setResumeMaxBytes(transfers.limits.maxFileBytes)
      setActive(previous => result.docs.find(item => item.id === previous?.id) || previous)
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Lecture impossible.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [params])

  useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort() }, [load])
  useEffect(() => {
    if (!activeID) return
    const abort = new AbortController()
    fetch(`/api/media-tools?action=usage&id=${activeID}`, { signal: abort.signal }).then(jsonResponse).then((result: Usages) => { setUsages(result); setActive(result.media) }).catch(failure => { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Inventaire impossible.') })
    return () => abort.abort()
  }, [activeID]) // The inventory is explicitly refreshed again before a replacement.

  const refreshUsage = async () => {
    if (!active) return
    setError('')
    try { const result = await jsonResponse(await fetch(`/api/media-tools?action=usage&id=${active.id}`)) as Usages; setUsages(result); setActive(previous => previous?.id === result.media.id ? result.media : previous) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Inventaire impossible.') }
  }
  const open = (item: LibraryMedia) => { setActive(item); setUsages(null); setReplacementID(''); setReplacementImported(null); setError(''); setNotice('') }
  const mutate = async (body: Record<string, unknown>) => jsonResponse(await fetch('/api/media-tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
  const metadata = async (ids: string[], patch: Record<string, unknown>) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const records = [...(listing?.docs || []), ...(active ? [active] : [])]
      const revisions = Object.fromEntries(ids.map(id => [id, records.find(item => String(item.id) === id)?.updatedAt]))
      const result = await mutate({ action: 'metadata', ids, patch, revisions })
      setNotice(`${result.updated} média(s) mis à jour. Les changements de diffusion s’appliquent immédiatement aux fichiers.`)
      await load(); await refreshUsage()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }

  const importFiles = async (files: globalThis.File[], retryIndexes?: number[]) => {
    if (!files.length) return
    setBusy(true); setError(''); setNotice('')
    if (!retryIndexes) { uploadFiles.current = files; uploadImageEdits.current = {}; setUploads(files.map(file => ({ name: file.name, progress: 0, state: 'pending' }))) }
    const indexes = retryIndexes || files.map((_, index) => index)
    for (const index of indexes) {
      setUploads(rows => rows.map((row, current) => current === index ? { ...row, state: 'uploading', progress: 0, error: undefined } : row))
      try {
        if (files[index].size > (resumeMaxBytes || listing?.storage.maxFileBytes || 100 * 1024 * 1024)) throw new Error('Ce fichier dépasse la limite configurée.')
        if (!(index in uploadImageEdits.current)) {
          const chosen = configureImages && isImage(files[index]) ? await chooseImageEdits(files[index]) : undefined
          if (chosen === null) throw new Error('Import annulé avant le transfert.')
          uploadImageEdits.current[index] = chosen
        }
        await uploadFile(files[index], uploadCollection, progress => setUploads(rows => rows.map((row, current) => current === index ? { ...row, progress, state: progress === 100 ? 'processing' : 'uploading' } : row)), undefined, uploadImageEdits.current[index])
        setUploads(rows => rows.map((row, current) => current === index ? { ...row, state: 'done', progress: 100 } : row))
      } catch (failure) { setUploads(rows => rows.map((row, current) => current === index ? { ...row, state: 'error', error: failure instanceof Error ? failure.message : 'Import impossible.' } : row)) }
    }
    setBusy(false); await load()
    setNotice('Les imports réussis sont enregistrés en diffusion restreinte. Vérifiez leurs textes alternatifs et leurs droits avant publication.')
  }

  const uploadReplacement = async (file?: globalThis.File) => {
    if (!file) return
    setBusy(true); setError(''); setNotice('Import de la nouvelle version en cours…')
    try { const imageEdits = isImage(file) ? await chooseImageEdits(file) : undefined; if (imageEdits === null) { setNotice('Import annulé.'); return } const next = await uploadFile(file, active?.collection || '', () => {}, undefined, imageEdits); setReplacementImported(next); setReplacementID(String(next.id)); await load(); setNotice('Nouvelle version importée en diffusion restreinte. Vérifiez les usages puis remplacez les références des brouillons.'); await refreshUsage() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Import impossible.') }
    finally { setBusy(false) }
  }
  const resumeImport = async (session: MediaImportStatus, file?: globalThis.File) => {
    if (!file) return
    setBusy(true); setError(''); setNotice('Vérification de l’empreinte du fichier…')
    try { await uploadFile(file, session.collection, progress => setNotice(`${session.name} · transfert ${progress} %${progress === 100 ? ' · traitement serveur…' : ''}`), session.id, session.imageEdits); setNotice('Import repris et média enregistré en diffusion restreinte.'); await load() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Reprise impossible.'); await load() }
    finally { setBusy(false) }
  }
  const cancelImport = async (id: string) => {
    setBusy(true); setError('')
    try { await jsonResponse(await fetch('/api/media-imports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', id }) })); await load(); setNotice('Import en attente annulé. Ses fragments privés ont été retirés.') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Annulation impossible.') }
    finally { setBusy(false) }
  }
  const replace = async () => {
    if (!active || !usages || !replacementID) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await mutate({ action: 'replace', fromID: active.id, toID: replacementID, fingerprint: usages.fingerprint })
      setNotice(`${result.updated.length} brouillon(s) modifié(s). Aucune publication effectuée. L’original et ses historiques restent conservés.`)
      await refreshUsage()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Remplacement impossible.') }
    finally { setBusy(false) }
  }
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget)
    setParams({ q: String(fields.get('q') || ''), collection: String(fields.get('collection') || ''), tag: String(fields.get('tag') || ''), type: String(fields.get('type') || ''), page: 1 }); setSelectedIDs([])
  }

  return <main className="mis-library">
    <style>{libraryCSS}</style>
    {imageDraft && <ImageImportEditor file={imageDraft.file} confirm={edits => { imageDraft.resolve(edits); setImageDraft(null) }} cancel={() => { imageDraft.resolve(null); setImageDraft(null) }} />}
    <header className="ml-header"><div><Link href="/admin" className="ml-back"><ArrowLeft size={16} /> Administration</Link><p className="ml-eyebrow">MIS · Images, films et documents</p><h1>Médiathèque</h1><p>Des originaux conservés, des usages identifiés.</p></div><Link className="ml-secondary" href="/espace-client">Documents de projets privés</Link></header>
    {error && <div className="ml-alert" role="alert">{error}<button type="button" aria-label="Fermer l’erreur" onClick={() => setError('')}><X size={16} /></button></div>}
    {notice && <p className="ml-notice" role="status">{notice}</p>}
    <section className="ml-import" aria-labelledby="media-import"><div><h2 id="media-import"><Upload size={20} /> Importer des fichiers</h2><p>Images, MP4, WebM, MP3, PDF et VTT. Les documents confidentiels de clients vont dans leur espace projet.</p><small>{listing ? `Maximum ${bytes(resumeMaxBytes || listing.storage.maxFileBytes)} par fichier. ` : ''}Les fichiers sont d’abord restreints. L’empreinte complète est vérifiée avant transfert. En cas d’interruption, resélectionnez le même fichier : seuls les fragments manquants sont envoyés. Les imports en attente expirent à la date indiquée.</small></div><div><label>Collection des imports<input value={uploadCollection} maxLength={120} onChange={event => setUploadCollection(event.target.value)} placeholder="Ex. Tournage / projet" disabled={busy} /></label><label className="ml-primary ml-file-label">Choisir plusieurs fichiers<input type="file" accept={acceptedTypes} multiple disabled={busy} onChange={event => { void importFiles(Array.from(event.target.files || [])); event.target.value = '' }} /></label><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={configureImages} disabled={busy} onChange={event => setConfigureImages(event.target.checked)} /> Choisir le cadrage et le point focal des images</label></div></section>
    {!!uploads.length && <section className="ml-upload-list" aria-label="État des imports"><ul>{uploads.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><span>{item.state === 'done' ? 'Enregistré' : item.state === 'error' ? item.error : item.state === 'pending' ? 'En attente' : item.state === 'processing' ? 'Traitement serveur…' : `Empreinte / transfert ${item.progress} %`}</span></li>)}</ul>{uploads.some(row => row.state === 'error') && <button disabled={busy} onClick={() => void importFiles(uploadFiles.current, uploads.flatMap((row, index) => row.state === 'error' ? [index] : []))}>Reprendre les fichiers en échec</button>}</section>}
    {!!pendingImports.length && <section className="ml-upload-list" aria-label="Imports conservés à reprendre"><h2>Imports à reprendre</h2><ul>{pendingImports.map(session => <li key={session.id}><div><strong>{session.name}</strong><small>{bytes(session.receivedBytes)} / {bytes(session.size)} confirmés · expire le {date(session.expiresAt)}</small>{session.error && <small>{session.error}</small>}</div><div><label className="ml-secondary ml-file-label">Resélectionner le même fichier<input type="file" accept={acceptedTypes} disabled={busy} onChange={event => { void resumeImport(session, event.target.files?.[0]); event.target.value = '' }} /></label><button disabled={busy} onClick={() => void cancelImport(session.id)}>Annuler l’import</button></div></li>)}</ul></section>}
    {listing && <section className="ml-storage" aria-label="Stockage observé"><strong>{listing.storage.available ? `${bytes(listing.storage.bytes)} / ${bytes(listing.storage.maxStorageBytes)}` : 'Stockage non mesuré'}</strong><span>{listing.storage.available ? `${listing.storage.files} fichiers, originaux et variantes inclus · mesure locale ${date(listing.storage.observedAt)}` : listing.storage.reason}</span>{listing.storage.available && (listing.storage.bytes || 0) / listing.storage.maxStorageBytes >= .85 && <b>Le stockage approche de sa limite.</b>}</section>}
    <form className="ml-filters" onSubmit={submitFilters}><label>Rechercher<input name="q" defaultValue={params.q} placeholder="Nom ou texte alternatif" /></label><label>Collection<input name="collection" defaultValue={params.collection} placeholder="Nom exact" /></label><label>Étiquette<input name="tag" defaultValue={params.tag} placeholder="Étiquette exacte" /></label><label>Type<select name="type" defaultValue={params.type}><option value="">Tous les formats</option><option value="image">Images</option><option value="video">Vidéos</option><option value="audio">Audio</option><option value="application">Documents PDF</option><option value="text">Sous-titres</option></select></label><button type="submit" disabled={loading}>Filtrer</button><button type="button" onClick={() => void load()} disabled={loading}>Actualiser</button></form>
    {!!selectedIDs.length && <section className="ml-bulk" aria-label="Actions groupées"><strong>{selectedIDs.length} sélectionné(s)</strong><label>Déplacer dans la collection<input value={bulkCollection} maxLength={120} onChange={event => setBulkCollection(event.target.value)} /></label><button disabled={busy} onClick={() => void metadata(selectedIDs, { collection: bulkCollection })}>Déplacer</button><label>Remplacer les étiquettes<input value={bulkTags} placeholder="séparées par une virgule" onChange={event => setBulkTags(event.target.value)} /></label><button disabled={busy} onClick={() => void metadata(selectedIDs, { tags: bulkTags.split(',').map(tag => tag.trim()).filter(Boolean) })}>Appliquer</button><button disabled={busy} onClick={() => void metadata(selectedIDs, { visibility: 'restricted' })}>Restreindre la diffusion</button></section>}
    <div className={`ml-workspace ${active ? 'ml-has-selection' : ''}`}><section aria-label="Fichiers disponibles"><div className="ml-results"><span>{listing?.totalDocs ?? '—'} média(s)</span>{loading && <span role="status">Chargement…</span>}</div>
      {listing?.docs.length === 0 && <div className="ml-empty"><ImageIcon size={36} /><h2>Aucun média dans cette sélection</h2><p>Importez un fichier ou ajustez vos filtres. Les images historiques du site peuvent encore utiliser leurs adresses d’origine.</p></div>}
      <div className="ml-grid">{listing?.docs.map(item => <article key={item.id} className={`ml-card ${active?.id === item.id ? 'ml-active' : ''}`}><label className="ml-select"><input type="checkbox" checked={selectedIDs.includes(String(item.id))} onChange={event => setSelectedIDs(ids => event.target.checked ? [...ids, String(item.id)] : ids.filter(id => id !== String(item.id)))} aria-label={`Sélectionner ${item.filename}`} /></label><button className="ml-open" onClick={() => open(item)}><MediaPreview item={item} /><div className="ml-card-text"><strong>{item.alt || item.filename}</strong><span>{item.filename}</span><small>{bytes(item.filesize)} · {item.mimeType?.split('/')[1]?.toUpperCase()}</small><em>{item.visibility === 'public' ? 'Public' : 'Restreint'}{item.rightsUntil && Date.parse(item.rightsUntil) <= Date.now() ? ' · droits expirés' : ''}</em></div></button></article>)}</div>
      {listing && listing.totalPages > 1 && <nav className="ml-pagination" aria-label="Pages de médias"><button disabled={loading || params.page <= 1} onClick={() => { setParams(value => ({ ...value, page: value.page - 1 })); setSelectedIDs([]) }}>Précédente</button><span>{params.page} / {listing.totalPages}</span><button disabled={loading || params.page >= listing.totalPages} onClick={() => { setParams(value => ({ ...value, page: value.page + 1 })); setSelectedIDs([]) }}>Suivante</button></nav>}
    </section>
    {active && <aside className="ml-detail" aria-label="Fiche du média"><div className="ml-detail-heading"><h2>{active.filename}</h2><button aria-label="Fermer la fiche" onClick={() => { setActive(null); setUsages(null) }}><X size={18} /></button></div><MediaPreview item={active} expanded /><p className="ml-meta">{active.width && active.height ? `${active.width} × ${active.height} px · ` : ''}{bytes(active.filesize)} · {active.mimeType}<br />Import / modification : {date(active.updatedAt)}</p>{active.url && <a className="ml-secondary" href={active.url} target="_blank" rel="noreferrer">Ouvrir le fichier original ↗</a>}<Link className="ml-secondary" href={`/admin/collections/media/${active.id}`}>Affiche, sous-titres et réglages avancés</Link>
      <form key={`${active.id}-${active.updatedAt}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void metadata([String(active.id)], { alt: form.get('alt'), collection: form.get('collection'), tags: String(form.get('tags')).split(',').map(value => value.trim()).filter(Boolean), credit: form.get('credit'), authorization: form.get('authorization'), visibility: form.get('visibility'), rightsUntil: form.get('rightsUntil') || null, transcript: form.get('transcript'), language: form.get('language') }) }}>
        <label>Texte alternatif / description (français)<input name="alt" defaultValue={active.alt || ''} required maxLength={2000} /></label><label>Collection<input name="collection" defaultValue={active.collection || ''} maxLength={120} /></label><label>Étiquettes<textarea name="tags" defaultValue={(active.tags || []).join(', ')} placeholder="séparées par une virgule" /></label><label>Crédit<input name="credit" defaultValue={active.credit || ''} maxLength={400} /></label><label>Autorisation et restrictions<textarea name="authorization" defaultValue={active.authorization || ''} maxLength={4000} /></label><label>Diffusion<select name="visibility" defaultValue={active.visibility || 'restricted'}><option value="restricted">Restreinte · équipe éditoriale</option><option value="public">Publique · adresse accessible</option></select></label><label>Fin des droits (fin de journée à Paris)<input type="date" name="rightsUntil" defaultValue={dateInput(active.rightsUntil)} /></label><label>Langue du fichier<select name="language" defaultValue={active.language || 'fr'}><option value="fr">Français</option><option value="en">English</option></select></label><label>Transcription (français)<textarea name="transcript" defaultValue={active.transcript || ''} maxLength={200000} /></label><button className="ml-primary" disabled={busy}>Enregistrer les informations</button><small>Les droits et la diffusion du fichier prennent effet immédiatement. Les fichiers privés de clients sont gérés séparément.</small>
      </form>
      <section className="ml-usage"><div className="ml-detail-heading"><h3>Usages du média</h3><button onClick={() => void refreshUsage()} disabled={busy}>Actualiser</button></div>{!usages ? <p>Inventaire des contenus et historiques…</p> : <><p>{usages.usages.length} emplacement(s) · vérifié {date(usages.checkedAt)}</p>{!usages.usages.length && <p>Aucune référence trouvée dans le périmètre contrôlé.</p>}<ul>{usages.usages.map((item, index) => <li key={`${item.source}-${item.id}-${item.kind}-${index}`}><span className="ml-kind">{usageLabels[item.kind]}</span><Link href={item.href}>{item.title}</Link><small>{item.fields.length} référence(s) · {item.fields.slice(0, 3).join(', ')}{item.fields.length > 3 ? '…' : ''}</small></li>)}</ul><small>{usages.scope}</small></>}</section>
      <section className="ml-replace"><h3>Remplacer dans les brouillons</h3><p>Une nouvelle version garde l’original intact. Les versions publiques et les historiques conservent leurs fichiers jusqu’à une publication explicite.</p><label>1. Importer une nouvelle version<input type="file" accept={acceptedTypes} disabled={busy} onChange={event => { void uploadReplacement(event.target.files?.[0]); event.target.value = '' }} /></label><label>Ou choisir un média déjà importé<select value={replacementID} onChange={event => setReplacementID(event.target.value)}><option value="">Sélectionnez un média</option>{replacementImported && !listing?.docs.some(item => item.id === replacementImported.id) && <option value={replacementImported.id}>{replacementImported.filename} · nouvel import</option>}{listing?.docs.filter(item => item.id !== active.id && item.mimeType?.split('/')[0] === active.mimeType?.split('/')[0]).map(item => <option key={item.id} value={item.id}>{item.filename} · {item.alt}</option>)}</select></label><button className="ml-primary" disabled={busy || !replacementID || !usages?.usages.some(item => item.replaceable)} onClick={() => void replace()}>2. Remplacer les références des brouillons</button><small>Les modèles et dépendances de médias sont signalés mais ne sont pas modifiés automatiquement. Un recadrage ou point focal différent se crée à l’import d’un nouveau média. La suppression physique reste désactivée pour préserver les restaurations.</small></section>
    </aside>}
    </div>
  </main>
}

function MediaPreview({ item, expanded = false }: { item: LibraryMedia; expanded?: boolean }) {
  if (item.mimeType?.startsWith('image/') && item.url) return <div className={`ml-preview ${expanded ? 'ml-expanded' : ''}`}><img src={item.sizes?.card?.url || item.url} alt={expanded ? item.alt || '' : ''} loading="lazy" /></div>
  if (expanded && item.mimeType?.startsWith('video/') && item.url) return <video className="ml-expanded-video" src={item.url} controls preload="metadata" />
  if (expanded && item.mimeType?.startsWith('audio/') && item.url) return <audio controls src={item.url} preload="metadata" />
  const Icon = item.mimeType?.startsWith('video/') ? Film : item.mimeType?.startsWith('audio/') ? Music : File
  return <div className="ml-preview"><Icon size={42} strokeWidth={1.2} /><span>{item.mimeType?.split('/')[1]?.toUpperCase()}</span></div>
}

const libraryCSS = `
.mis-library{max-width:1680px;margin:auto;padding:36px 36px 80px;color:#f1f0ea;font:15px/1.55 Arial,sans-serif}.mis-library *{box-sizing:border-box}.ml-header{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:32px}.ml-header h1{font-family:Georgia,serif;font-size:48px;font-weight:400;line-height:1.1;margin:12px 0}.ml-header p{margin:8px 0;color:#c1c3b5}.ml-back{display:inline-flex;align-items:center;gap:8px;color:#d9c28d;text-decoration:none}.ml-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase}.mis-library h2{font-size:18px;margin:0 0 10px;display:flex;gap:10px;align-items:center}.mis-library h3{font-size:16px;margin:0 0 12px}.mis-library small{display:block;color:#b8bdad;font-size:12px;line-height:1.6}.mis-library button,.ml-primary,.ml-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 15px;border:1px solid #4c5042;border-radius:6px;background:#25281f;color:#f1f0ea;font:inherit;cursor:pointer;text-decoration:none}.mis-library button:disabled,.mis-library input:disabled{opacity:.45;cursor:not-allowed}.mis-library .ml-primary{background:#c9a961;color:#11150b;border-color:#c9a961;font-weight:600}.mis-library :focus-visible{outline:2px solid #f4d68d;outline-offset:3px}.mis-library label{display:grid;gap:6px;font-size:12px;color:#d0d1c7}.mis-library input:not([type=checkbox]):not([type=file]),.mis-library select,.mis-library textarea{width:100%;min-height:44px;background:#171a13;color:#f3f2ed;border:1px solid #454a39;border-radius:5px;padding:10px;font:15px Arial,sans-serif}.mis-library textarea{min-height:76px;resize:vertical}.ml-import{border:1px solid #4a4a38;border-radius:12px;background:#1c1f16;padding:24px;display:grid;grid-template-columns:1fr 280px;gap:32px}.ml-import p{color:#c1c3b5;margin:8px 0}.ml-import>div:last-child{display:grid;gap:14px}.ml-file-label{position:relative}.ml-file-label input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.ml-file-label:focus-within{outline:2px solid #f4d68d;outline-offset:3px}.ml-upload-list{margin:18px 0;border:1px solid #404635;padding:18px}.ml-upload-list ul,.ml-usage ul{list-style:none;padding:0;margin:0}.ml-upload-list li{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #363c2d;padding:9px 0}.ml-storage{display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:12px;color:#bdc1b1;margin:22px 0}.ml-storage strong{color:#f2eddc;font-size:15px}.ml-storage b{color:#f1c46f}.ml-filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto auto;align-items:end;gap:12px;margin:28px 0}.ml-bulk{display:flex;gap:12px;align-items:end;flex-wrap:wrap;border-block:1px solid #464b37;padding:18px 0;margin-bottom:22px}.ml-bulk strong{align-self:center;color:#e0c58a}.ml-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:28px}.ml-has-selection{grid-template-columns:minmax(0,1fr) 380px}.ml-results{display:flex;justify-content:space-between;font-size:13px;color:#c2c5b8;margin:0 0 18px}.ml-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.ml-has-selection .ml-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ml-card{position:relative;border:1px solid #363d2c;border-radius:10px;overflow:hidden;background:#191d14}.ml-card.ml-active{border-color:#d0b775;box-shadow:0 0 0 1px #d0b775}.ml-card .ml-open{display:block;text-align:left;width:100%;padding:0;border:0;background:transparent;border-radius:0;min-height:0}.ml-preview{height:150px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;background:#22271b;color:#b8c0a4}.ml-preview img{width:100%;height:100%;object-fit:cover}.ml-preview span{font-size:11px;letter-spacing:.12em}.ml-card-text{display:grid;gap:5px;padding:16px}.ml-card-text strong{font-size:14px;overflow-wrap:anywhere}.ml-card-text span{font-size:11px;color:#aab29b;overflow-wrap:anywhere}.ml-card-text em{font-style:normal;color:#e0c78e;font-size:11px}.ml-select{position:absolute;z-index:2;top:10px;left:10px;background:#141910aa;padding:8px;border-radius:5px}.ml-select input{width:18px;height:18px;accent-color:#c9a961;margin:0}.ml-pagination{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:30px}.ml-detail{border:1px solid #424a33;border-radius:10px;background:#191e13;padding:22px;min-width:0;align-self:start}.ml-detail-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:18px}.ml-detail-heading h2{overflow-wrap:anywhere;margin:0;font-size:16px}.ml-detail-heading button{padding:8px;flex-shrink:0}.ml-expanded{height:auto;min-height:180px;max-height:300px;border-radius:6px;overflow:hidden}.ml-expanded img{height:auto;max-height:300px;object-fit:contain}.ml-expanded-video{width:100%;max-height:260px}.ml-detail audio{width:100%}.ml-meta{font-size:12px;color:#bcc3ae;margin:14px 0}.ml-detail form{display:grid;gap:16px;margin:24px 0 32px}.ml-usage,.ml-replace{border-top:1px solid #424a33;padding-top:24px;margin-top:24px}.ml-usage p,.ml-replace p{font-size:13px;color:#c3c9b7}.ml-usage li{padding:14px 0;border-bottom:1px solid #343c2a;display:grid;gap:6px}.ml-usage a{color:#e4c98e;text-decoration:none;font-size:14px}.ml-usage small{overflow-wrap:anywhere}.ml-kind{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#c1c8b2}.ml-replace{display:grid;gap:15px}.ml-replace h3,.ml-replace p{margin:0}.ml-empty{padding:64px 24px;text-align:center;border:1px dashed #46503a;border-radius:10px;color:#b8c2a5}.ml-empty svg{margin:0 auto 18px}.ml-empty h2{justify-content:center}.ml-empty p{max-width:550px;margin:auto}.ml-alert,.ml-notice{padding:16px 20px;border-radius:6px;margin:20px 0}.ml-alert{background:#542b26;color:#ffddd5;display:flex;align-items:center;justify-content:space-between;gap:20px}.ml-notice{background:#253924;color:#d6edcb}.ml-alert button{border:0;background:transparent;padding:8px}@media(max-width:1200px){.ml-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ml-has-selection .ml-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ml-filters{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:850px){.mis-library{padding:24px 18px 60px}.ml-header{align-items:start}.ml-header h1{font-size:38px}.ml-import{grid-template-columns:1fr;padding:20px;gap:20px}.ml-has-selection{grid-template-columns:1fr}.ml-detail{grid-row:1}.ml-grid,.ml-has-selection .ml-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ml-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.ml-header>.ml-secondary{max-width:180px;font-size:12px}.ml-upload-list li{display:grid;gap:3px}}@media(max-width:420px){.ml-grid,.ml-has-selection .ml-grid{grid-template-columns:1fr}.ml-header{display:block}.ml-header>.ml-secondary{max-width:none;margin-top:18px}.ml-filters{grid-template-columns:1fr}.ml-storage{display:grid;gap:6px}}
`;
