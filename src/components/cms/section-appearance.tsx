'use client'
import type {PageBlock} from '@/cms/page-types'
type Appearance=NonNullable<PageBlock['appearance']>
export function SectionAppearanceEditor({value,onChange}:{value:Appearance;onChange:(value:Appearance)=>void}){
  const patch=(next:Partial<Appearance>)=>onChange({...value,...next})
  return <>
    <label>Grilles historiques<select value={value.gridLayout||'original'} onChange={e=>patch({gridLayout:e.target.value as Appearance['gridLayout']})}><option value="original">Composition d’origine</option><option value="uniform">Grille régulière — colonnes réglables</option></select></label>
    <label>Couleur du texte<select value={value.color||'inherit'} onChange={e=>patch({color:e.target.value})}><option value="inherit">Hériter</option><option value="light">Clair</option><option value="muted">Atténué</option><option value="gold">Or</option></select></label>
    {(['customBackground','customColor'] as const).map(key=><label key={key}>{key==='customBackground'?'Fond personnalisé':'Texte personnalisé'}<input type="text" placeholder="#c9a961 · vide = héritage" maxLength={7} value={value[key]||''} onChange={e=>patch({[key]:e.target.value})}/></label>)}
    <label>Typographie locale<select value={value.typeface||'inherit'} onChange={e=>patch({typeface:e.target.value as Appearance['typeface']})}><option value="inherit">Hériter</option><option value="sans">Sans empattement</option><option value="serif">Éditoriale</option><option value="mono">Technique</option></select></label>
    <label>Colonnes tablette<input type="number" min={1} max={4} placeholder="Hériter" value={value.tabletColumns??''} onChange={e=>patch({tabletColumns:e.target.value?Number(e.target.value):undefined})}/></label>
    <label>Colonnes mobile<input type="number" min={1} max={2} value={value.mobileColumns||1} onChange={e=>patch({mobileColumns:Number(e.target.value)})}/></label>
    <label><span><input style={{width:'auto'}} type="checkbox" checked={!!value.border} onChange={e=>patch({border:e.target.checked})}/> Afficher une bordure</span></label>
    <label>Animation<select value={value.animation||'inherit'} onChange={e=>patch({animation:e.target.value as Appearance['animation']})}><option value="inherit">Hériter</option><option value="none">Aucune</option><option value="fade">Apparition douce</option></select></label>
    {value.animation==='fade'&&<label>Durée (ms)<input type="number" min={100} max={1500} step={50} value={value.animationDuration||500} onChange={e=>patch({animationDuration:Number(e.target.value)})}/></label>}
    <p className="mis-editor-help">En grille régulière, les colonnes s’appliquent aux piliers, chiffres, cartes univers, réalisations hors mise en avant, témoignages, tarifs/options et galerie d’univers. Les en-têtes, bandeaux et lignes de prestations gardent leur composition. Les préférences de réduction des mouvements restent prioritaires.</p>
  </>
}
