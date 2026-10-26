import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Payload, PayloadRequest } from 'payload'
import { fromPayloadContent, toPayloadContent } from '../src/cms/content-fields'

const directory=path.resolve('.data/tests/core-'+randomUUID())
mkdirSync(directory,{recursive:true})
process.env.PAYLOAD_SECRET=randomBytes(48).toString('hex')
process.env.DATABASE_URL='file:'+path.join(directory,'cms.db').replaceAll('\\','/')
Object.assign(process.env,{NODE_ENV:'test'})
process.env.CMS_SCHEMA_PUSH='true'
let cms:Payload, owner:NonNullable<PayloadRequest['user']>, client:NonNullable<PayloadRequest['user']>
let seedCMS: typeof import('../scripts/cms-seed')['seedCMS'], saveEditor: typeof import('../src/cms/editor-service')['saveEditor']
before(async()=>{
  cms=await (await import('../src/cms/payload')).getCMS()
  seedCMS=(await import('../scripts/cms-seed')).seedCMS
  saveEditor=(await import('../src/cms/editor-service')).saveEditor
  const password=randomBytes(24).toString('base64url')
  owner=await cms.create({collection:'users',context:{bootstrap:true},data:{name:'Recette isolée propriétaire',email:'owner@example.test',password,role:'owner'}}) as typeof owner
  owner.collection='users'
  client=await cms.create({collection:'users',user:owner,data:{name:'Recette isolée client',email:'client@example.test',password:randomBytes(24).toString('base64url'),role:'client'}}) as typeof client
  client.collection='users'
  const auth=await cms.login({collection:'users',data:{email:'owner@example.test',password}})
  assert.ok(auth.token,'Une vraie session est délivrée après vérification du mot de passe')
  await seedCMS(cms)
})
after(async()=>{await cms?.destroy()})

test('CMS intégré : import, publication, droits, restauration, programmation et sauvegarde', async t=>{
  await t.test('import idempotent sans écrasement éditorial',async()=>{
    const first=await cms.find({collection:'pages',where:{path:{equals:'/'}},limit:1})
    await cms.update({collection:'pages',id:first.docs[0].id,data:{title:'Accueil contrôlé'},user:owner,overrideAccess:false})
    assert.deepEqual(await seedCMS(cms),{created:0,existing:8})
    assert.equal((await cms.findByID({collection:'pages',id:first.docs[0].id})).title,'Accueil contrôlé')
  })
  await t.test('brouillon texte et composition isolés, aperçu autorisé, publication atomique et conflit détecté',async()=>{
    const releasesBefore=(await cms.count({collection:'publication-releases'})).totalDocs
    const page=(await cms.find({collection:'pages',where:{path:{equals:'/'}},draft:true,limit:1})).docs[0]
    const raw=await cms.findGlobal({slug:'site-content',draft:true})
    const content=(await import('../src/cms/content-fields')).fromPayloadContent(raw)
    const oldTitle=content.hero.firstVerb
    content.hero.firstVerb='Créer'
    const changed=[...page.layout,{blockType:'editorial',title:'Section de recette',body:'Contenu isolé de test',appearance:{columns:2}}]
    const draft=await saveEditor(cms,owner,Number(page.id),{pageUpdatedAt:page.updatedAt,contentUpdatedAt:raw.updatedAt,layout:changed,content})
    assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false})).hero.firstVerb,oldTitle)
    const publicPage=await cms.findByID({collection:'pages',id:page.id,draft:false,overrideAccess:false})
    assert.equal(publicPage.layout.length,page.layout.length)
    await assert.rejects(()=>cms.findByID({collection:'pages',id:page.id,draft:true,overrideAccess:false,user:client}),/./)
    await assert.rejects(()=>saveEditor(cms,owner,Number(page.id),{pageUpdatedAt:page.updatedAt,contentUpdatedAt:raw.updatedAt,layout:changed}),/CONFLICT/)
    const published=await saveEditor(cms,owner,Number(page.id),{pageUpdatedAt:draft.page.updatedAt,contentUpdatedAt:draft.content.updatedAt,publish:true})
    assert.equal(published.page._status,'published')
    assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false})).hero.firstVerb,'Créer')
    assert.equal((await cms.findByID({collection:'pages',id:page.id,draft:false,overrideAccess:false})).layout.length,changed.length)
    assert.equal((await cms.count({collection:'publication-releases'})).totalDocs,releasesBefore+1)
  })
  await t.test('nouvelle page et univers sans route code, SEO et redirections sans boucle',async()=>{
    const p=await cms.create({collection:'pages',user:owner,overrideAccess:false,data:{title:'Nouvel univers de recette',path:'/recette-univers',kind:'universe',layout:[{blockType:'editorial',title:'Univers de recette'}],_status:'published'}})
    assert.equal((await cms.find({collection:'pages',where:{path:{equals:'/recette-univers'}},overrideAccess:false})).totalDocs,1)
    await cms.update({collection:'pages',id:p.id,user:owner,overrideAccess:false,data:{path:'/recette-renommee',_status:'published'}})
    assert.equal((await cms.find({collection:'redirects',where:{from:{equals:'/recette-univers'}}})).docs[0].to,'/recette-renommee')
    await assert.rejects(()=>cms.create({collection:'redirects',data:{from:'/recette-renommee',to:'/recette-univers'}}),/boucle/)
  })
  await t.test('historique réel et restauration de page en brouillon',async()=>{
    const p=await cms.create({collection:'pages',data:{title:'Version A',path:'/version-test',layout:[{blockType:'editorial',title:'A'}],_status:'published'}})
    const versions=await cms.findVersions({collection:'pages',where:{parent:{equals:p.id}},sort:'createdAt',limit:10})
    await cms.update({collection:'pages',id:p.id,data:{layout:[{blockType:'editorial',title:'B'}],_status:'draft'},draft:true})
    await cms.restoreVersion({collection:'pages',id:versions.docs[0].id,user:owner,overrideAccess:false,draft:true})
    assert.equal((await cms.findByID({collection:'pages',id:p.id,draft:true})).layout[0].title,'A')
  })
  await t.test('programmation persistante et droits du planificateur',async()=>{
    const p=await cms.create({collection:'pages',data:{title:'Programmation',path:'/programme-test',layout:[{blockType:'editorial',title:'En attente'}],_status:'draft'},draft:true})
    const job=await cms.jobs.queue({task:'schedulePublish',input:{type:'publish',doc:{relationTo:'pages',value:String(p.id)},user:{relationTo:'users',value:owner.id}},waitUntil:new Date(Date.now()-1000)})
    await cms.jobs.run({limit:10})
    const done=await cms.findByID({collection:'payload-jobs',id:job.id})
    assert.ok(done.completedAt)
    assert.equal((await cms.findByID({collection:'pages',id:p.id,draft:false,overrideAccess:false}))._status,'published')
  })
  await t.test('protection dernier propriétaire, accès aux versions et paramètres',async()=>{
    await assert.rejects(()=>cms.delete({collection:'users',id:owner.id,user:owner,overrideAccess:false}),/dernier propriétaire/)
    await cms.update({collection:'users',id:client.id,data:{role:'owner'},user:client,overrideAccess:false})
    assert.equal((await cms.findByID({collection:'users',id:client.id})).role,'client')
    await assert.rejects(()=>cms.findVersions({collection:'pages',user:client,overrideAccess:false}),/./)
    await assert.rejects(()=>cms.findGlobal({slug:'site-content',user:client,overrideAccess:false,draft:true}),/./)
  })
  await t.test('traductions relues, repli français et obsolescence après modification source',async()=>{
    const source=await cms.findGlobal({slug:'site-content',locale:'fr'})
    const translated=fromPayloadContent(source)
    translated.hero.firstVerb='Create'
    await cms.updateGlobal({slug:'site-content',locale:'en',data:{...toPayloadContent(translated),translationState:'reviewed',_status:'published'}})
    assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',locale:'en'})).hero.firstVerb,'Create')
    assert.equal((await cms.findGlobal({slug:'site-content',locale:'en'})).translationState,'reviewed')
    const french=fromPayloadContent(source); french.hero.firstVerb='Réaliser'
    await cms.updateGlobal({slug:'site-content',locale:'fr',data:{...toPayloadContent(french),_status:'published'}})
    assert.equal((await cms.findGlobal({slug:'site-content',locale:'en'})).translationState,'outdated')
    assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',locale:'en'})).hero.firstVerb,'Create')
    const page=await cms.create({collection:'pages',data:{title:'Source française',path:'/traduction-test',layout:[{blockType:'editorial',title:'Texte français'}],_status:'published'}})
    assert.equal((await cms.findByID({collection:'pages',id:page.id,locale:'en'})).title,'Source française')
    await cms.update({collection:'pages',id:page.id,locale:'en',data:{title:'English title',translationState:'reviewed'}})
    assert.equal((await cms.findByID({collection:'pages',id:page.id,locale:'en'})).translationState,'reviewed')
    await cms.update({collection:'pages',id:page.id,locale:'fr',data:{title:'Source modifiée'}})
    assert.equal((await cms.findByID({collection:'pages',id:page.id,locale:'en'})).translationState,'outdated')
  })
  await t.test('sauvegarde SQLite cohérente puis restauration isolée',async()=>{
    const db=new DatabaseSync(path.join(directory,'cms.db'))
    const backup=path.join(directory,'restore.db')
    db.exec(`VACUUM INTO '${backup.replaceAll("'","''")}'`)
    const restored=new DatabaseSync(backup)
    assert.equal(restored.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok')
    assert.deepEqual(restored.prepare('SELECT count(*) n FROM pages').get(),db.prepare('SELECT count(*) n FROM pages').get())
    assert.deepEqual(restored.prepare('SELECT count(*) n FROM _pages_v').get(),db.prepare('SELECT count(*) n FROM _pages_v').get())
    restored.close();db.close()
  })
})
