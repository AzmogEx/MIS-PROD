import type {Payload,PayloadRequest} from 'payload'
import {sql} from '@payloadcms/db-sqlite'
import {hasRole} from './access'
export type AudienceBreakdown={pages:{key:string;views:number;entries:number}[];sources:{key:string;count:number}[];devices:{key:string;count:number}[]}
export async function getAudienceBreakdown(payload:Payload,user:PayloadRequest['user'],from:string,to:string):Promise<AudienceBreakdown>{
  if(!hasRole(user,['owner','admin','sales']))throw new Error('Accès commercial requis.')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw new Error('Période invalide.')
  const db=payload.db.drizzle
  const pages=await db.all<{key:string;views:number;entries:number}>(sql`SELECT page_key AS key, count(*) AS views,sum(CASE WHEN entry=1 THEN 1 ELSE 0 END) AS entries FROM analytics_events WHERE event='page_view' AND day>=${from} AND day<=${to} AND page_key IS NOT NULL GROUP BY page_key ORDER BY views DESC LIMIT 50`)
  const sources=await db.all<{key:string;count:number}>(sql`SELECT coalesce(acquisition,'unknown') AS key,count(*) AS count FROM analytics_events WHERE event='page_view' AND entry=1 AND day>=${from} AND day<=${to} GROUP BY acquisition ORDER BY count DESC`)
  const devices=await db.all<{key:string;count:number}>(sql`SELECT coalesce(device,'unknown') AS key,count(*) AS count FROM analytics_events WHERE event='page_view' AND day>=${from} AND day<=${to} GROUP BY device ORDER BY count DESC`)
  return {pages,sources,devices}
}
