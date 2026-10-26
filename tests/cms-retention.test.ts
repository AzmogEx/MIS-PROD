import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdir,readdir,readFile} from 'node:fs/promises'
import {buildConfig,getPayload} from 'payload'
import {sqliteAdapter} from '@payloadcms/db-sqlite'
import {installTransactionQueue} from '../src/cms/transaction-queue'
import {applyRetention} from '../src/cms/retention'
test('Conservation : aperçu, archives durables avant purge, corbeille des briefs et reprise idempotente',async()=>{
  const dir=path.resolve('.data/tests/retention-'+randomUUID());await mkdir(dir,{recursive:true});const root=path.join(dir,'archives')
  const cms=await getPayload({config:buildConfig({secret:randomBytes(32).toString('hex'),telemetry:false,admin:{disable:true},typescript:{autoGenerate:false},onInit:async payload=>installTransactionQueue(payload),db:sqliteAdapter({client:{url:'file:'+path.join(dir,'cms.db').replaceAll('\\','/')},push:true,transactionOptions:{behavior:'immediate'}}),collections:[{slug:'users',auth:true,fields:[]},...['analytics-events','audit-log','briefs'].map(slug=>({slug,trash:slug==='briefs',fields:[{name:'occurredAt',type:'date' as const},{name:'text',type:'text' as const}]}))]})})
  Object.assign(process.env,{CMS_RETENTION_ANALYTICS_DAYS:'30',CMS_RETENTION_AUDIT_DAYS:'30',CMS_RETENTION_BRIEF_DAYS:'30',CMS_RETENTION_ENABLED:'disabled'})
  try{
    for(const collection of ['analytics-events','audit-log','briefs'])await cms.create({collection,data:{text:'Recette locale',occurredAt:new Date().toISOString()}})
    const now=new Date(Date.now()+40*86400000)
    assert.equal((await applyRetention(cms,{apply:true,now,root,healthFile:path.join(dir,'health.json')})).applied,false);assert.equal((await cms.count({collection:'analytics-events'})).totalDocs,1)
    process.env.CMS_RETENTION_ENABLED='enabled'
    assert.equal((await applyRetention(cms,{now,root,healthFile:path.join(dir,'health.json')})).applied,false)
    const result=await applyRetention(cms,{apply:true,now,root,healthFile:path.join(dir,'health.json')});assert.equal(result.archives,3)
    assert.equal((await cms.count({collection:'analytics-events'})).totalDocs,0);assert.equal((await cms.count({collection:'audit-log'})).totalDocs,0)
    const briefs=await cms.find({collection:'briefs',trash:true});assert.equal(briefs.totalDocs,1);assert.ok(briefs.docs[0].deletedAt)
    assert.equal((await readdir(root)).length,3);assert.equal(JSON.parse(await readFile(path.join(root,(await readdir(root))[0]),'utf8')).document.text,'Recette locale')
    assert.equal((await applyRetention(cms,{apply:true,now,root,healthFile:path.join(dir,'health.json')})).archives,0)
  }finally{for(const key of ['CMS_RETENTION_ENABLED','CMS_RETENTION_ANALYTICS_DAYS','CMS_RETENTION_AUDIT_DAYS','CMS_RETENTION_BRIEF_DAYS'])delete process.env[key];await cms.destroy()}
})
