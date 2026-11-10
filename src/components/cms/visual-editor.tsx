'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MediaRecord, PageBlock, PageRecord } from '@/cms/page-types'
import type { SiteContent } from '@/cms/seed-content'
import { contentLabels } from '@/cms/content-fields'
import { SectionAppearanceEditor } from './section-appearance'
import { MediaAssetPicker } from './media-asset-picker'

const names: Record<string, string> = { hero: 'Introduction', manifesto: 'Manifeste', stats: 'Chiffres', universes: 'Univers', portfolio: 'Réalisations', clients: 'Confiance', cta: 'Invitation au brief', pricing: 'Tarifs mariage', universe: 'Page univers', contact: 'Formulaire', editorial: 'Titre, texte et média', columns: 'Colonnes', gallery: 'Galerie', faq: 'Questions fréquentes', steps: 'Étapes / équipe', shared: 'Section synchronisée', legal: 'Document légal' }
const contentKey: Record<string, keyof SiteContent> = { hero: 'hero', manifesto: 'manifesto', stats: 'stats', universes: 'universesSection', portfolio: 'portfolioSection', clients: 'clientsSection', cta: 'cta', pricing: 'pricing', universe: 'universes', navigation: 'navigation', footer: 'footer', site: 'site' }
const contentNames: Record<string, string> = { navigation: 'En-tête et navigation', footer: 'Pied de page', site: 'Coordonnées et identité du studio' }
const labels: Record<string, string> = { title:'Titre', eyebrow:'Surtitre', body:'Texte', subtitle:'Sous-titre', firstVerb:'Ligne 1 · emphase', firstRest:'Ligne 1 · suite', secondVerb:'Ligne 2 · emphase', secondRest:'Ligne 2 · suite', thirdVerb:'Ligne 3 · emphase', thirdRest:'Ligne 3 · suite', showreelLabel:'Bouton showreel', showreelHref:'Lien showreel', universesLabel:'Bouton univers', universesHref:'Lien univers', titleBefore:'Titre · début', titleEmphasis:'Titre · emphase', titleAfter:'Titre · suite', introduction:'Introduction', studioLabel:'Libellé studio', onAirLabel:'Indicateur antenne', studioEyebrow:'Surtitre studio', liveLabel:'Libellé direct', scrollLabel:'Défilement', backgroundLabel:'Vidéo · nom accessible', poster:'Affiche vidéo', autoplay:'Lecture automatique', showTimecode:'Afficher le timecode', description:'Description', label:'Libellé', href:'Adresse du lien', name:'Nom', value:'Valeur', source:'Justificatif', verified:'Vérifié', heading:'Titre accessible', kicker:'Accroche', prefix:'Préfixe', suffix:'Suffixe', decimals:'Décimales', link:'Adresse du lien', linkLabel:'Texte du bouton', question:'Question', answer:'Réponse', imageSrc:'Image', logoImage:'Logo' }
const hiddenKeys = new Set(['id', 'blockType', 'blockName', 'appearance', 'hidden', 'anchor', 'section'])
type MediaChoice = MediaRecord & { id: number; label: string }

function displayLabel(key: string) { return labels[key] || contentLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase()) }
function blankCopy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(blankCopy)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => key !== 'id').map(([key, item]) => [key, blankCopy(item)]))
  if (typeof value === 'string') return ''
  if (typeof value === 'number') return 0
  if (typeof value === 'boolean') return false
  return value
}
function itemName(item: unknown, index: number) {
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>
    const name = record.title || record.label || record.question || record.name || record.key
    if (typeof name === 'string' && name.trim()) return `Élément ${index + 1} · ${name}`
  }
  return `Élément ${index + 1}`
}

function TextFields({ value, change, media, depth = 0, path = '', arrayLabel }: { value: Record<string, unknown>; change: (next: Record<string, unknown>) => void; media: MediaChoice[]; depth?: number; path?: string; arrayLabel?: string }) {
  return <div className="mis-editor-field-list">{Object.entries(value).filter(([key]) => !hiddenKeys.has(key)).map(([key, field]) => {
    const label = key === 'items' && path && !path.includes('.') && arrayLabel ? arrayLabel : displayLabel(key)
    const editorPath = path ? `${path}.${key}` : key
    if (key === 'media') {
      const current = typeof field === 'object' && field !== null ? Number((field as MediaRecord).id) : Number(field || 0)
      const selectedMedia = media.find(item => item.id === current)
      return <label key={key}>{label}<select data-editor-path={editorPath} value={current || ''} onChange={event => change({ ...value, media: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Aucune image</option>{media.filter(item => item.url && item.visibility !== 'restricted').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>{selectedMedia?.url && selectedMedia.mimeType?.startsWith('image/') && <Image unoptimized width={1200} height={800} className="mis-editor-image-choice" src={selectedMedia.url} alt="Aperçu du média sélectionné" />}</label>
    }
    if (typeof field === 'string' && (/image(src)?$/i.test(key) || ['favicon', 'shortcutIcon', 'appleIcon', 'shareImage', 'poster'].includes(key))) return <MediaAssetPicker key={key} editorPath={editorPath} kind={key} label={label} value={field} onChange={url => change({ ...value, [key]: url })} />
    if (typeof field === 'string') return <label key={key}>{label}{field.length > 90 || ['body','description','introduction','answer','text'].includes(key) ? <textarea data-editor-path={editorPath} value={field} onChange={event => change({ ...value, [key]: event.target.value })} /> : <input data-editor-path={editorPath} value={field} onChange={event => change({ ...value, [key]: event.target.value })} />}</label>
    if (typeof field === 'number') return <label key={key}>{label}<input data-editor-path={editorPath} type="number" value={field} onChange={event => change({ ...value, [key]: Number(event.target.value) })} /></label>
    if (typeof field === 'boolean') return <label className="mis-editor-check" key={key}><input data-editor-path={editorPath} type="checkbox" checked={field} onChange={event => change({ ...value, [key]: event.target.checked })} /> {label}</label>
    if (Array.isArray(field)) return <details className="mis-editor-list" key={key} open={depth === 0 && field.length > 0}>
      <summary>{label} <span>{field.length} élément{field.length > 1 ? 's' : ''}</span></summary>
      <div className="mis-editor-list-body">{field.map((entry, index) => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) return <details className="mis-editor-list-item" key={index} open={depth === 0 && index === 0}>
          <summary>{itemName(entry, index)}</summary>
          <TextFields value={entry as Record<string, unknown>} media={media} depth={depth + 1} path={`${editorPath}.${index}`} change={next => change({ ...value, [key]: field.map((item, i) => i === index ? next : item) })} />
          <button type="button" className="mis-editor-remove" onClick={() => { if (window.confirm('Supprimer cet élément ?')) change({ ...value, [key]: field.filter((_, i) => i !== index) }) }}>Supprimer cet élément</button>
        </details>
        if (typeof entry === 'string' || typeof entry === 'number') return <div className="mis-editor-array-value" key={index}><label>{`Élément ${index + 1}`}<input data-editor-path={`${editorPath}.${index}`} value={entry} onChange={event => change({ ...value, [key]: field.map((item, i) => i === index ? (typeof entry === 'number' ? Number(event.target.value) : event.target.value) : item) })} /></label><button type="button" aria-label={`Supprimer l’élément ${index + 1}`} onClick={() => { if (window.confirm('Supprimer cet élément ?')) change({ ...value, [key]: field.filter((_, i) => i !== index) }) }}>Retirer</button></div>
        return null
      })}
        {field.length > 0 && <button type="button" onClick={() => change({ ...value, [key]: [...field, blankCopy(field[0])] })}>Ajouter un élément</button>}
        {!field.length && <p className="mis-editor-help">Aucun élément dans cette liste.</p>}
      </div>
    </details>
    if (field && typeof field === 'object') return <details className="mis-editor-object" key={key} open={depth === 0}>
      <summary>{label}</summary>
      <TextFields value={field as Record<string,unknown>} media={media} depth={depth + 1} path={editorPath} change={next => change({ ...value, [key]: next })} />
    </details>
    return null
  })}</div>
}

function copyBlock(block: PageBlock): PageBlock { const copy = structuredClone(block); delete copy.id; if (copy.items) copy.items = copy.items.map(copyBlock); return copy }

export function VisualEditor({ initialPage, initialContent, contentUpdatedAt, media, locale = 'fr' }: { initialPage: PageRecord; initialContent: SiteContent; contentUpdatedAt: string; media: MediaChoice[]; locale?: 'fr' | 'en' }) {
  const [page,setPage] = useState(initialPage), [content,setContent] = useState(initialContent)
  const [revision,setRevision] = useState(contentUpdatedAt), [selected,setSelected] = useState(0), [field,setField] = useState<string | undefined>(contentKey[initialPage.layout[0]?.blockType]), [contentOnly,setContentOnly] = useState(false)
  const [focusPath,setFocusPath] = useState<string>(), [focusRevision,setFocusRevision] = useState(0)
  const [width,setWidth] = useState('100%'), [status,setStatus] = useState('Prêt à modifier'), [error,setError] = useState(''), [dirty,setDirty] = useState(false), [busy,setBusy] = useState(false), [previewReady,setPreviewReady] = useState(false)
  const [newType,setNewType] = useState('editorial'), [templates,setTemplates] = useState<{id:number;title:string;layout:PageBlock[]}[]>([])
  const changes = useRef(0), saving = useRef(false), frame = useRef<HTMLIFrameElement>(null)
  const mark = () => { changes.current++; setDirty(true); setStatus('Modifications en cours…') }
  const select = useCallback((index:number, key?:string) => { setSelected(index); setContentOnly(false); setField(key || contentKey[page.layout[index]?.blockType]) }, [page.layout])

  useEffect(() => {
    const listener = (event:MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'mis:preview-ready' && String(event.data.pageID) === String(page.id)) { setPreviewReady(true); return }
      if (event.data?.type === 'mis:select') {
        const group = typeof event.data.field === 'string' ? event.data.field : undefined
        const rawPath = typeof event.data.path === 'string' ? event.data.path : undefined
        const pathGroup = rawPath?.split('.')[0]
        const selectedGroup = group && rawPath?.startsWith(`${group}.`) ? group : pathGroup && pathGroup in initialContent ? pathGroup : group
        setFocusPath(rawPath); setFocusRevision(current => current + 1)
        if (typeof event.data.block === 'number') { select(event.data.block, selectedGroup); if (selectedGroup && selectedGroup !== group) setContentOnly(true) }
        else if (selectedGroup && selectedGroup in initialContent) { setField(selectedGroup); setContentOnly(true) }
      }
    }
    window.addEventListener('message',listener); return () => window.removeEventListener('message',listener)
  },[select,page.id,initialContent])

  useEffect(() => {
    if (!focusPath) return
    const frameID = window.requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-path]')).find(element => element.dataset.editorPath === focusPath)
      if (!target) return
      for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true
      target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frameID)
  },[focusPath,focusRevision,selected,contentOnly,field])

  useEffect(() => {
    if (!previewReady) return
    const timer = window.setTimeout(() => frame.current?.contentWindow?.postMessage({ type: 'mis:preview-update', page, content, media }, location.origin), 30)
    return () => window.clearTimeout(timer)
  }, [previewReady,page,content,media])

  const save = useCallback(async (publish=false) => {
    if (saving.current) return
    saving.current=true; setBusy(true); setError(''); setStatus(publish ? 'Publication en cours…' : 'Enregistrement du brouillon…')
    const generation=changes.current
    try {
      const res=await fetch(`/api/editor/${page.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pageUpdatedAt:page.updatedAt,contentUpdatedAt:revision,layout:page.layout,content,publish,locale})})
      const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setPage(current=>({...current,updatedAt:data.page.updatedAt,_status:data.page._status}));setRevision(data.content.updatedAt)
      if(generation===changes.current) setDirty(false)
      setStatus(publish?'Publié sur le site':'Brouillon enregistré automatiquement')
    }catch(err){setError(err instanceof Error?err.message:'Erreur inconnue.');setStatus('Erreur — modifications conservées dans cet écran')}
    finally{saving.current=false;setBusy(false)}
  },[page,content,revision,locale])
  useEffect(()=>{if(!dirty||error||busy)return;const timer=setTimeout(()=>void save(),1200);return()=>clearTimeout(timer)},[dirty,error,busy,save])
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])

  const block=page.layout[selected]
  const updateBlock=(update:Partial<PageBlock>)=>{setPage(p=>({...p,layout:p.layout.map((b,i)=>i===selected?{...b,...update}:b)}));mark()}
  const changeOrder=(offset:number)=>{const to=selected+offset;if(to<0||to>=page.layout.length)return;setPage(p=>{const layout=[...p.layout];[layout[selected],layout[to]]=[layout[to],layout[selected]];return{...p,layout}});setSelected(to);mark()}
  const createBlock = (): PageBlock => ({blockType:newType,title:newType==='editorial'?'Votre titre':'',body:'',linkLabel:'',link:'',appearance:{columns:3},...(newType==='universe'?{universeSlug:content.universes[0]?.slug}:{}),...(['columns','steps'].includes(newType)?{items:[{blockType:'editorial',title:'Premier élément',body:''}]}:{})})
  const add=(blocks:PageBlock[])=>{setPage(p=>({...p,layout:[...p.layout,...blocks.map(copyBlock)]}));setSelected(page.layout.length);setContentOnly(false);setField(contentKey[blocks[0]?.blockType]);mark()}
  const makeTemplate=async()=>{if(!block)return;setError('');try{const response=await fetch('/api/section-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`${page.title} — ${names[block.blockType]}`,layout:[copyBlock(block)]})});if(!response.ok)throw new Error('Impossible d’enregistrer le modèle.');setStatus('Modèle enregistré')}catch(e){setError(String(e))}}
  const loadTemplates=async()=>{const res=await fetch('/api/section-templates?limit=100');const data=await res.json();if(res.ok)setTemplates(data.docs);else setError('Impossible de lire les modèles.')}
  const selectedContent = field && field in content ? content[field as keyof SiteContent] : null
  const selectedContentFields = Array.isArray(selectedContent) ? { items: selectedContent } : selectedContent as Record<string,unknown> | null
  const updateSelectedContent = (value: Record<string,unknown>) => {
    if (!field) return
    setContent(current => ({ ...current, [field]: Array.isArray(selectedContent) ? value.items : value }) as SiteContent)
    mark()
  }

  return <div className="mis-editor">
    <header className="mis-editor-top">
      <Link href="/admin">← Administration</Link><div className="mis-editor-title"><h1>Modifier : {page.title}</h1><small role="status" aria-live="polite">{dirty ? 'Modifications pas encore enregistrées' : status}</small></div>
      <span className="mis-editor-language">Langue : {locale === 'en' ? 'anglais' : 'français'}</span>
      <label className="mis-editor-viewport">Aperçu<select aria-label="Taille de l’aperçu" value={width} onChange={event=>setWidth(event.target.value)}><option value="100%">Ordinateur</option><option value="768px">Tablette</option><option value="390px">Mobile</option></select></label>
      <button disabled={busy || !dirty} onClick={()=>void save()}>Enregistrer</button><button className="primary" disabled={busy} onClick={()=>void save(true)}>Publier sur le site</button>
      <Link href={locale === 'en' ? '/en' + (page.path === '/' ? '' : page.path) : page.path} target="_blank" rel="noreferrer">Voir le site ↗</Link>
    </header>
    <div className="mis-editor-guide"><strong>Modifiez votre site simplement</strong><span>Cliquez sur le texte, le bouton ou l’image à modifier. Le champ correspondant s’ouvre ici et l’aperçu change tout de suite. Vos changements sont enregistrés en brouillon ; cliquez sur « Publier sur le site » pour les rendre visibles.</span></div>
    {error && <div role="alert" className="mis-editor-alert">{error} <button onClick={()=>{setError('');void save()}}>Réessayer</button></div>}

    <div className="mis-editor-body">
      <div className="mis-editor-preview" aria-label="Aperçu du site"><iframe ref={frame} title={`Aperçu de ${page.title} (${locale})`} src={`/apercu/${page.id}?locale=${locale}`} style={{width}} /></div>
      <aside className="mis-editor-fields">
        <h2>Modifier la page</h2>
        <label htmlFor="mis-section-select">Section sélectionnée</label>
        <select id="mis-section-select" value={contentOnly ? `content:${field}` : String(selected)} onChange={event=>{const value=event.target.value;if(value.startsWith('content:')){setField(value.slice(8));setContentOnly(true)}else select(Number(value))}}>
          {contentOnly && field && <option value={`content:${field}`}>{contentNames[field] || displayLabel(field)}</option>}
          {page.layout.map((item,index)=><option value={index} key={item.id||index}>{item.blockName||names[item.blockType]||item.blockType}{item.hidden?' · masquée':''}</option>)}
        </select>
        <p className="mis-editor-help">Cliquez sur un texte, un bouton ou une image dans l’aperçu pour ouvrir son champ ici.</p>
        {block && !contentOnly ? <>
          <h3>{names[block.blockType] || block.blockType}</h3>
          {block.blockType === 'shared' && block.section && <p className="mis-editor-help">Cette section est réutilisée sur plusieurs pages. <Link href={`/admin/collections/shared-sections/${typeof block.section === 'object' ? block.section.id : block.section}`}>Ouvrir ses textes et ses images →</Link></p>}
          <TextFields value={block as unknown as Record<string,unknown>} media={media} change={value=>updateBlock(value as unknown as PageBlock)} />
          {selectedContentFields && <section className="mis-editor-shared"><h3>Textes et images de cette section</h3><p className="mis-editor-help">Ces éléments peuvent aussi apparaître sur d’autres pages.</p><TextFields value={selectedContentFields} media={media} path={field || ''} arrayLabel={field ? contentNames[field] || displayLabel(field) : undefined} change={updateSelectedContent} /></section>}
        </> : selectedContentFields ? <><h3>{contentNames[field!] || displayLabel(field!)}</h3><TextFields value={selectedContentFields} media={media} path={field || ''} arrayLabel={field ? contentNames[field] || displayLabel(field) : undefined} change={updateSelectedContent} /></> : <p>Aucune section. Ajoutez-en une dans les options avancées.</p>}

        <details className="mis-editor-advanced"><summary>Options avancées et composition</summary>
          <p className="mis-editor-help">Ces réglages servent à organiser ou mettre en forme la page. Les textes et images se modifient dans le panneau ci-dessus.</p>
          <h3>Sections de la page</h3><ol className="mis-editor-section-list">{page.layout.map((item,index)=><li key={item.id||index}><button aria-current={selected===index?'true':undefined} onClick={()=>select(index)}>{index+1}. {item.blockName||names[item.blockType]||item.blockType}{item.hidden?' · masquée':''}</button></li>)}</ol>
          <label htmlFor="block-type">Ajouter une section</label><select id="block-type" value={newType} onChange={event=>setNewType(event.target.value)}>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select><button className="mis-editor-wide-button" onClick={()=>add([createBlock()])}>Ajouter cette section</button>
          {block && !contentOnly && <><h3>Gérer cette section</h3><div className="mis-editor-actions"><button onClick={()=>changeOrder(-1)} disabled={selected===0}>Monter</button><button onClick={()=>changeOrder(1)} disabled={selected===page.layout.length-1}>Descendre</button><button onClick={()=>add([block])}>Dupliquer</button><button onClick={()=>updateBlock({hidden:!block.hidden})}>{block.hidden?'Afficher':'Masquer'}</button><button onClick={()=>{if(window.confirm('Retirer cette section de la page ?')){setPage(current=>({...current,layout:current.layout.filter((_,i)=>i!==selected)}));setSelected(Math.max(0,selected-1));mark()}}}>Retirer</button><button onClick={()=>void makeTemplate()}>Enregistrer comme modèle</button></div>
            <SectionAppearanceEditor value={block.appearance || {}} onChange={appearance => updateBlock({ appearance })} />
            <h3>Disposition locale</h3>{[['background','Fond',['inherit','dark','elevated','gold'],['Hériter','Sombre','Surélevé','Or']],['align','Alignement',['left','center','right'],['Gauche','Centré','Droite']],['width','Largeur',['wide','reading','full'],['Large','Lecture','Pleine largeur']],['spacing','Espacement',['inherit','compact','normal','generous'],['Hériter','Compact','Normal','Généreux']]].map(([key,label,values,titles])=><label key={String(key)}>{label as string}<select value={String((block.appearance as Record<string,unknown>)?.[String(key)]|| (values as string[])[0])} onChange={event=>updateBlock({appearance:{...block.appearance,[String(key)]:event.target.value}})}>{(values as string[]).map((value,index)=><option key={value} value={value}>{(titles as string[])[index]}</option>)}</select></label>)}
            <label>Colonnes ordinateur<input type="number" min={1} max={4} value={block.appearance?.columns||3} onChange={event=>updateBlock({appearance:{...block.appearance,columns:Number(event.target.value)}})} /></label><label>Arrondi<input type="number" min={0} max={64} value={block.appearance?.radius||0} onChange={event=>updateBlock({appearance:{...block.appearance,radius:Number(event.target.value)}})} /></label><button onClick={()=>updateBlock({appearance:{}})}>Réinitialiser le style</button>
          </>}
          <h3>Mes modèles</h3><button onClick={()=>void loadTemplates()}>Charger mes modèles</button>{templates.map(template=><button className="mis-editor-wide-button" key={template.id} onClick={()=>add(template.layout)}>{template.title}</button>)}
          <h3>Langue, référencement et historique</h3><p><Link href={`/atelier/${page.id}?locale=${locale === 'en' ? 'fr' : 'en'}`}>Ouvrir {locale === 'en' ? 'le français' : 'l’anglais'}</Link></p><p><Link href={`/admin/collections/pages/${page.id}?locale=${locale}`}>SEO et versions →</Link></p><p><Link href="/admin/collections/publication-releases">Historique des publications →</Link></p><p><Link href="/admin/globals/site-content">Tous les textes du site →</Link></p>
        </details>
      </aside>
    </div>
  </div>
}
