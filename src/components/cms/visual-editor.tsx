'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PageBlock, PageRecord } from '@/cms/page-types'
import type { SiteContent } from '@/cms/seed-content'
import { contentLabels } from '@/cms/content-fields'
import { SectionAppearanceEditor } from './section-appearance'
import { MediaAssetPicker } from './media-asset-picker'

const names: Record<string, string> = { hero: 'Introduction', manifesto: 'Manifeste', stats: 'Chiffres', universes: 'Univers', portfolio: 'Réalisations', clients: 'Confiance', cta: 'Invitation au brief', pricing: 'Tarifs mariage', universe: 'Page univers', contact: 'Formulaire', editorial: 'Titre, texte et média', columns: 'Colonnes', gallery: 'Galerie', faq: 'Questions fréquentes', steps: 'Étapes / équipe', shared: 'Section synchronisée', legal: 'Document légal' }
const contentKey: Record<string, keyof SiteContent> = { hero: 'hero', manifesto: 'manifesto', stats: 'stats', universes: 'universesSection', portfolio: 'portfolioSection', clients: 'clientsSection', cta: 'cta', pricing: 'pricing', universe: 'universes' }
const labels: Record<string, string> = { title:'Titre', eyebrow:'Surtitre', body:'Texte', subtitle:'Sous-titre', firstVerb:'Ligne 1 · emphase', firstRest:'Ligne 1 · suite', secondVerb:'Ligne 2 · emphase', secondRest:'Ligne 2 · suite', thirdVerb:'Ligne 3 · emphase', thirdRest:'Ligne 3 · suite', showreelLabel:'Bouton showreel', showreelHref:'Lien showreel', universesLabel:'Bouton univers', universesHref:'Lien univers', titleBefore:'Titre · début', titleEmphasis:'Titre · emphase', titleAfter:'Titre · suite', introduction:'Introduction', studioLabel:'Libellé studio', onAirLabel:'Indicateur antenne', studioEyebrow:'Surtitre studio', liveLabel:'Libellé direct', scrollLabel:'Défilement', backgroundLabel:'Vidéo · nom accessible', poster:'Affiche vidéo', autoplay:'Lecture automatique', showTimecode:'Afficher le timecode', description:'Description', label:'Libellé', href:'Adresse', name:'Nom', value:'Valeur', source:'Justificatif', verified:'Vérifié', heading:'Titre accessible', kicker:'Accroche', prefix:'Préfixe', suffix:'Suffixe', decimals:'Décimales', link:'Adresse du bouton', linkLabel:'Texte du bouton', question:'Question', answer:'Réponse' }
function copyBlock(block: PageBlock): PageBlock { const copy = structuredClone(block); delete copy.id; if (copy.items) copy.items = copy.items.map(copyBlock); return copy }
function TextFields({ value, change }: { value: Record<string, unknown>; change: (next: Record<string, unknown>) => void }) {
  return <>{Object.entries(value).filter(([key]) => !['id','blockType','appearance','hidden','anchor','media','section','items','sections'].includes(key)).map(([key, field]) => {
    const label = labels[key] || contentLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2')
    if (typeof field === 'string' && /^(favicon|shortcutIcon|appleIcon|shareImage|logoImage)$/.test(key)) return <MediaAssetPicker key={key} kind={key} label={label} value={field} onChange={url => change({ ...value, [key]: url })} />
    if (typeof field === 'string') return <label key={key}>{label}{field.length > 90 || ['body','description','introduction'].includes(key) ? <textarea value={field} onChange={e => change({ ...value, [key]: e.target.value })} /> : <input value={field} onChange={e => change({ ...value, [key]: e.target.value })} />}</label>
    if (typeof field === 'number') return <label key={key}>{label}<input type="number" value={field} onChange={e => change({ ...value, [key]: Number(e.target.value) })} /></label>
    if (typeof field === 'boolean') return <label key={key}><span><input style={{ width:'auto', minHeight:20 }} type="checkbox" checked={field} onChange={e => change({ ...value, [key]: e.target.checked })} /> {label}</span></label>
    return null
  })}</>
}
export function VisualEditor({ initialPage, initialContent, contentUpdatedAt, media, locale = 'fr' }: { initialPage: PageRecord; initialContent: SiteContent; contentUpdatedAt: string; media: { id:number; label:string }[]; locale?: 'fr' | 'en' }) {
  const [page,setPage] = useState(initialPage), [content,setContent] = useState(initialContent)
  const [revision,setRevision] = useState(contentUpdatedAt), [selected,setSelected] = useState(0), [field,setField] = useState<string | undefined>(contentKey[initialPage.layout[0]?.blockType])
  const [width,setWidth] = useState('100%'), [status,setStatus] = useState('Enregistré'), [error,setError] = useState(''), [dirty,setDirty] = useState(false), [busy,setBusy] = useState(false), [previewVersion,setPreviewVersion] = useState(0)
  const [newType,setNewType] = useState('editorial'), [templates,setTemplates] = useState<{id:number;title:string;layout:PageBlock[]}[]>([])
  const changes = useRef(0), saving = useRef(false), frame = useRef<HTMLIFrameElement>(null)
  const mark = () => { changes.current++; setDirty(true); setStatus('Modifications à enregistrer') }
  const select = useCallback((index:number, key?:string) => { setSelected(index); setField(key || contentKey[page.layout[index]?.blockType]) }, [page.layout])
  useEffect(() => {
    const listener = (event:MessageEvent) => { if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'mis:select') return; if (typeof event.data.block === 'number') select(event.data.block, event.data.field) }
    window.addEventListener('message',listener); return () => window.removeEventListener('message',listener)
  },[select])
  const save = useCallback(async (publish=false) => {
    if (saving.current) return
    saving.current=true; setBusy(true); setError(''); setStatus(publish ? 'Publication en cours…' : 'Enregistrement…')
    const generation=changes.current
    try {
      const res=await fetch(`/api/editor/${page.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pageUpdatedAt:page.updatedAt,contentUpdatedAt:revision,layout:page.layout,content,publish,locale})})
      const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setPage(current=>({...current,updatedAt:data.page.updatedAt,_status:data.page._status}));setRevision(data.content.updatedAt)
      if(generation===changes.current) setDirty(false)
      setStatus(publish?'Publié sur le site local':'Brouillon enregistré');setPreviewVersion(v=>v+1)
    }catch(err){setError(err instanceof Error?err.message:'Erreur inconnue.');setStatus('Erreur — modifications conservées dans cet écran')}
    finally{saving.current=false;setBusy(false)}
  },[page,content,revision,locale])
  useEffect(()=>{if(!dirty||error||busy)return;const timer=setTimeout(()=>void save(),1200);return()=>clearTimeout(timer)},[dirty,error,busy,save])
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
  const block=page.layout[selected]
  const updateBlock=(update:Partial<PageBlock>)=>{setPage(p=>({...p,layout:p.layout.map((b,i)=>i===selected?{...b,...update}:b)}));mark()}
  const changeOrder=(offset:number)=>{const to=selected+offset;if(to<0||to>=page.layout.length)return;setPage(p=>{const layout=[...p.layout];[layout[selected],layout[to]]=[layout[to],layout[selected]];return{...p,layout}});setSelected(to);mark()}
  const add=(blocks:PageBlock[])=>{setPage(p=>({...p,layout:[...p.layout,...blocks.map(copyBlock)]}));setSelected(page.layout.length);setField(contentKey[blocks[0]?.blockType]);mark()}
  const makeTemplate=async()=>{if(!block)return;setError('');try{const response=await fetch('/api/section-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`${page.title} — ${names[block.blockType]}`,layout:[copyBlock(block)]})});if(!response.ok)throw new Error('Impossible d’enregistrer le modèle.');setStatus('Modèle enregistré — copie indépendante')}catch(e){setError(String(e))}}
  const loadTemplates=async()=>{const res=await fetch('/api/section-templates?limit=100');const data=await res.json();if(res.ok)setTemplates(data.docs);else setError('Impossible de lire les modèles.')}
  const selectedContent = field && field in content ? content[field as keyof SiteContent] : null
  return <div className="mis-editor">
    <div className="mis-editor-alert">Langue : {locale === 'en' ? 'anglais' : 'français'}. <Link href={`/atelier/${page.id}?locale=${locale === 'en' ? 'fr' : 'en'}`}>Ouvrir {locale === 'en' ? 'le français' : 'l’anglais'}</Link>. Les champs non traduits utilisent le français. Les changements de composition s’appliquent aux deux langues. <Link href={`/admin/collections/pages/${page.id}?locale=${locale}`}>État de relecture et SEO →</Link></div>
    <header className="mis-editor-top"><Link href="/admin">← Administration</Link><h1>{page.title}</h1><small role="status">{status}</small><select aria-label="Largeur de l’aperçu" value={width} onChange={e=>setWidth(e.target.value)}><option value="100%">Ordinateur</option><option value="768px">Tablette</option><option value="390px">Mobile</option></select><button disabled={busy} onClick={()=>void save()}>Enregistrer</button><button className="primary" disabled={busy} onClick={()=>void save(true)}>Publier</button><Link href={locale === 'en' ? '/en' + (page.path === '/' ? '' : page.path) : page.path} target="_blank" rel="noreferrer">Voir le site ↗</Link></header>
    {error && <div role="alert" className="mis-editor-alert">{error} <button onClick={()=>{setError('');void save()}}>Réessayer</button></div>}
    <div className="mis-editor-body"><nav className="mis-editor-nav" aria-label="Structure de la page"><h2>Composition</h2><ol>{page.layout.map((item,i)=><li key={item.id||i}><button aria-current={selected===i?'true':undefined} onClick={()=>select(i)}>{String(i+1).padStart(2,'0')} · {item.blockName||names[item.blockType]||item.blockType}{item.hidden?' (masquée)':''}</button></li>)}</ol><label htmlFor="block-type">Ajouter une section</label><select id="block-type" value={newType} onChange={e=>setNewType(e.target.value)} style={{width:'100%',margin:'10px 0'}}>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select><button onClick={()=>add([{blockType:newType,title:newType==='editorial'?'Votre titre':'',body:'',linkLabel:'',link:'',appearance:{columns:3},...(newType==='universe'?{universeSlug:content.universes[0]?.slug}:{}),...(['columns','steps'].includes(newType)?{items:[{blockType:'editorial',title:'Premier élément',body:''}]}:{})}])}>Ajouter</button><hr style={{margin:'24px 0',opacity:.2}}/><button onClick={()=>void loadTemplates()}>Charger mes modèles</button>{templates.map(t=><button key={t.id} onClick={()=>add(t.layout)} style={{width:'100%',marginTop:8}}>{t.title}</button>)}<p className="mis-editor-help">Un modèle crée une copie indépendante. Les sections synchronisées et les réglages globaux affectent leurs autres emplacements.</p><Link href={`/admin/collections/pages/${page.id}`}>SEO, versions et programmation →</Link><p><Link href="/admin/collections/publication-releases">Historique des publications →</Link></p></nav>
    <div className="mis-editor-preview"><iframe ref={frame} key={previewVersion} title={`Aperçu de ${page.title} (${locale})`} src={`/apercu/${page.id}?locale=${locale}`} style={{width}} /></div>
    <aside className="mis-editor-fields"><h2>Réglages de la sélection</h2>{block?<><h3>{names[block.blockType]}</h3><div className="mis-editor-actions"><button onClick={()=>changeOrder(-1)} disabled={selected===0}>Monter</button><button onClick={()=>changeOrder(1)} disabled={selected===page.layout.length-1}>Descendre</button><button onClick={()=>add([block])}>Dupliquer</button><button onClick={()=>updateBlock({hidden:!block.hidden})}>{block.hidden?'Afficher':'Masquer'}</button><button onClick={()=>{setPage(p=>({...p,layout:p.layout.filter((_,i)=>i!==selected)}));setSelected(Math.max(0,selected-1));mark()}}>Retirer</button><button onClick={()=>void makeTemplate()}>Enregistrer comme modèle</button></div>
      <TextFields value={block as unknown as Record<string,unknown>} change={v=>updateBlock(v as unknown as PageBlock)} />
      {['editorial','gallery'].includes(block.blockType)&&<label>Média de la section<select value={typeof block.media==='object'?block.media?.id:block.media||''} onChange={e=>updateBlock({media:e.target.value?Number(e.target.value):null})}><option value="">Aucun</option>{media.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
      {selectedContent && typeof selectedContent==='object' && !Array.isArray(selectedContent) && <><h3>Textes partagés</h3><p className="mis-editor-help">Ces valeurs sont partagées entre les pages. La publication applique leurs changements sur tous les emplacements.</p><TextFields value={selectedContent as unknown as Record<string,unknown>} change={v=>{setContent(c=>({...c,[field!]:v}));mark()}} /></>}
      <Link href="/admin/globals/site-content">Tous les textes, images et listes →</Link>
      <SectionAppearanceEditor value={block.appearance || {}} onChange={appearance => updateBlock({ appearance })} />
      <h3>Disposition locale</h3>{[['background','Fond',['inherit','dark','elevated','gold'],['Hériter','Sombre','Surélevé','Or']],['align','Alignement',['left','center','right'],['Gauche','Centré','Droite']],['width','Largeur',['wide','reading','full'],['Large','Lecture','Pleine largeur']],['spacing','Espacement',['inherit','compact','normal','generous'],['Hériter','Compact','Normal','Généreux']]].map(([key,label,values,titles])=><label key={String(key)}>{label}<select value={String((block.appearance as Record<string,unknown>)?.[String(key)]||values[0])} onChange={e=>updateBlock({appearance:{...block.appearance,[String(key)]:e.target.value}})}>{(values as string[]).map((v,i)=><option key={v} value={v}>{titles[i]}</option>)}</select></label>)}
      <label>Colonnes ordinateur<input type="number" min={1} max={4} value={block.appearance?.columns||3} onChange={e=>updateBlock({appearance:{...block.appearance,columns:Number(e.target.value)}})} /></label><label>Arrondi (px)<input type="number" min={0} max={64} value={block.appearance?.radius||0} onChange={e=>updateBlock({appearance:{...block.appearance,radius:Number(e.target.value)}})} /></label><button onClick={()=>updateBlock({appearance:{}})}>Revenir aux styles hérités</button><p className="mis-editor-help">Les blocs simples suivent les colonnes choisies. Pour les grilles historiques, activez « Grille régulière ». « Composition d’origine » conserve leur disposition et leur responsive initiaux.</p>
      {['columns','steps','gallery','faq','legal','shared'].includes(block.blockType)&&<p><Link href={`/admin/collections/pages/${page.id}`}>Modifier les éléments de cette section →</Link></p>}
    </>:<p>Sélectionnez ou ajoutez une section.</p>}</aside></div>
  </div>
}
