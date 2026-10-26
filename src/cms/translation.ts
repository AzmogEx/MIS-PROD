import { createHash } from 'node:crypto'
import type { Field } from 'payload'

export const translationFields: Field[] = [
  { name:'sourceRevision',label:'Empreinte de la version française',type:'text',admin:{readOnly:true,position:'sidebar'} },
  { name:'reviewedSourceRevision',label:'Version française relue pour cette traduction',type:'text',localized:true,admin:{readOnly:true,position:'sidebar'} },
]
export function contentRevision(value:Record<string,unknown>,keys:string[]) {
  const clean=(input:unknown):unknown=>Array.isArray(input)?input.map(clean):input&&typeof input==='object'?Object.fromEntries(Object.entries(input).filter(([key])=>!['id','updatedAt','createdAt'].includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,clean(v)])):input
  return createHash('sha256').update(JSON.stringify(clean(Object.fromEntries(keys.map(key=>[key,value[key]]))))).digest('hex')
}
export function translatedNavigation<T>(content:T):T {
  const visit=(value:unknown,key=''):unknown=>Array.isArray(value)?value.map(v=>visit(v,key)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,k)])):typeof value==='string' && /^(href|.*Href)$/.test(key) && /^\/(?!\/|api\/|en(?:\/|$))/.test(value)?'/en'+(value==='/'?'':value):value
  return visit(content) as T
}
