/** Keep editorial evidence and internal notes out of React's public payload. */
export function publicContent<T>(input:T):T {
  const visit=(value:unknown):unknown=>Array.isArray(value)?value.map(visit):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['source','verifiedAt','authorization','provenance','sourceKey'].includes(key)?'':visit(item)])):value
  return visit(input) as T
}
