'use client'
import { useState } from 'react'
import { useDocumentInfo, useLocale } from '@payloadcms/ui'

export function PageActions() { const { id }=useDocumentInfo();const locale=useLocale();return id?<p><a style={{display:'inline-flex',padding:'12px 20px',background:'#c9a961',color:'#111',borderRadius:4,textDecoration:'none'}} href={`/atelier/${id}?locale=${locale?.code === 'en' ? 'en' : 'fr'}`}>Ouvrir l’éditeur visuel →</a></p>:<p>Enregistrez la page pour ouvrir son éditeur visuel.</p> }
export function RestoreRelease() {
  const { id }=useDocumentInfo();const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  return <div><p>La restauration remet la composition, les contenus globaux et les versions historiques des sections synchronisées en brouillon, dans une seule opération. Le site public reste inchangé. Pour diffuser les sections restaurées, relisez et publiez-les explicitement avant la page : leurs autres pages sont aussi concernées. Publier la page seule ne publie jamais les brouillons de sections. La publication des contenus globaux concerne l’ensemble du site.</p><button disabled={!id||busy} type="button" onClick={async()=>{setBusy(true);try{const res=await fetch(`/api/editor/restore/${id}`,{method:'POST'});const data=await res.json();setMessage(data.message||data.error)}catch{setMessage('Restauration impossible.')}finally{setBusy(false)}}}>Restaurer en brouillon</button><p role="status">{message}</p></div>
}
