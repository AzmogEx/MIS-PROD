import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {buildConfig,getPayload,type PayloadRequest} from 'payload'
import {sqliteAdapter} from '@payloadcms/db-sqlite'
import {AnalyticsEvents,SubmissionLimits} from '../src/cms/operation-collections'
import {getAudienceBreakdown} from '../src/cms/audience-breakdown'
import {recordBrowserEvent} from '../src/cms/operations'

test('Audience SQLite : sources et entrées bornées à la période, refus des données libres et droits',async()=>{
  const dir=path.resolve('.data/tests/audience-'+randomUUID());await mkdir(dir,{recursive:true})
  const cms=await getPayload({config:buildConfig({secret:randomBytes(32).toString('hex'),telemetry:false,admin:{disable:true},typescript:{autoGenerate:false},db:sqliteAdapter({client:{url:'file:'+path.join(dir,'cms.db').replaceAll('\\','/')},push:true}),collections:[{slug:'users',auth:true,fields:[{name:'role',type:'text'}]},{slug:'pages',versions:{drafts:true},fields:[{name:'title',type:'text'}]},AnalyticsEvents,SubmissionLimits]})})
  process.env.CMS_BROWSER_ANALYTICS='enabled'
  try{
    const owner=await cms.create({collection:'users',data:{email:'audience@example.test',password:randomBytes(32).toString('hex'),role:'owner'}}) as PayloadRequest['user']
    const page=await cms.create({collection:'pages',data:{title:'Recette',_status:'published'}})
    const entry={event:'page_view',eventId:randomUUID(),consent:true,pageKey:`page-${page.id}`,entry:true,acquisition:'search',device:'mobile'}
    assert.equal(await recordBrowserEvent(cms,entry),true);assert.equal(await recordBrowserEvent(cms,entry),true)
    assert.equal((await cms.count({collection:'analytics-events'})).totalDocs,1)
    await recordBrowserEvent(cms,{...entry,eventId:randomUUID(),entry:false,acquisition:'internal'})
    await assert.rejects(recordBrowserEvent(cms,{...entry,eventId:randomUUID(),acquisition:'secret@example.test'}),/Source/)
    await assert.rejects(recordBrowserEvent(cms,{...entry,eventId:randomUUID(),referrer:'https://site.test/private'}),/personnelles/)
    const day=new Date().toISOString().slice(0,10)
    const data=await getAudienceBreakdown(cms,owner,day,day)
    assert.deepEqual(data.pages.map(row=>({...row})),[{key:`page-${page.id}`,views:2,entries:1}]);assert.deepEqual(data.sources.map(row=>({...row})),[{key:'search',count:1}]);assert.equal(data.devices[0].count,2)
    assert.equal((await getAudienceBreakdown(cms,owner,'2000-01-01','2000-01-02')).pages.length,0)
    await assert.rejects(getAudienceBreakdown(cms,null,day,day),/Accès/)
  }finally{delete process.env.CMS_BROWSER_ANALYTICS;await cms.destroy()}
})
