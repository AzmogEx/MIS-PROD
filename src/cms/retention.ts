import path from 'node:path'
import {createHash} from 'node:crypto'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createLocalReq,type Payload} from 'payload'

export function retentionPolicy(){
  const days=(key:string)=>{const value=Number(process.env[key]||0);if(!Number.isSafeInteger(value)||value<0||value>36500)throw new Error(`Durée de conservation invalide : ${key}`);return value}
  return {enabled:process.env.CMS_RETENTION_ENABLED==='enabled',analyticsDays:days('CMS_RETENTION_ANALYTICS_DAYS'),auditDays:days('CMS_RETENTION_AUDIT_DAYS'),briefArchiveDays:days('CMS_RETENTION_BRIEF_DAYS')}
}

/** Disabled by default. Only the operator's explicit retention policy can purge.
 * Every removed row first has a private, immutable JSON archive. Client files and
 * published/versioned content never enter this operation. Briefs only enter trash. */
export async function applyRetention(payload:Payload,{apply=false,now=new Date(),root=path.resolve('.data/retention-archives'),healthFile=path.resolve('.data/health/retention.json')}:{apply?:boolean;now?:Date;root?:string;healthFile?:string}={}){
  const policy=retentionPolicy()
  const plan=[{collection:'analytics-events',days:policy.analyticsDays,date:'createdAt',action:'purge'},{collection:'audit-log',days:policy.auditDays,date:'occurredAt',action:'purge'},{collection:'briefs',days:policy.briefArchiveDays,date:'updatedAt',action:'trash'}] as const
  const result={observedAt:now.toISOString(),applied:apply&&policy.enabled,policy,counts:{} as Record<string,number>,archives:0}
  for(const rule of plan){
    if(!rule.days){result.counts[rule.collection]=0;continue}
    const cutoff=new Date(now.getTime()-rule.days*86400000).toISOString()
    const where={and:[{[rule.date]:{less_than:cutoff}},...(rule.action==='trash'?[{deletedAt:{exists:false}}]:[])]}
    const count=await payload.count({collection:rule.collection,where,overrideAccess:true})
    result.counts[rule.collection]=count.totalDocs
    if(!result.applied||!count.totalDocs)continue
    const transactionID=await payload.db.beginTransaction()
    if(!transactionID)throw new Error('Transaction requise pour la conservation.')
    const req=await createLocalReq({},payload);req.transactionID=transactionID
    try{
      const rows=await payload.find({collection:rule.collection,where,limit:100,sort:rule.date,depth:0,overrideAccess:true,req})
      await mkdir(root,{recursive:true})
      for(const doc of rows.docs){
        const archive={format:1,collection:rule.collection,action:rule.action,document:doc}
        const bytes=JSON.stringify(archive,null,2)
        const checksum=createHash('sha256').update(bytes).digest('hex')
        const file=path.join(root,`${rule.collection}-${String(doc.id)}-${checksum}.json`)
        try{await writeFile(file,bytes,{flag:'wx',mode:0o600})}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;if(await readFile(file,'utf8')!==bytes)throw new Error('Archive existante incohérente ; aucune suppression.')}
        if(rule.action==='trash')await payload.update({collection:rule.collection,id:doc.id,data:{deletedAt:now.toISOString()},overrideAccess:true,req})
        else await payload.delete({collection:rule.collection,id:doc.id,overrideAccess:true,req})
        result.archives++
      }
      await payload.db.commitTransaction(transactionID)
    }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
  }
  if(result.applied){await mkdir(path.dirname(healthFile),{recursive:true});await writeFile(healthFile,JSON.stringify(result,null,2),{mode:0o600})}
  return result
}
