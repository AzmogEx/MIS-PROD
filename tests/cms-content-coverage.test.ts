import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {defaultContent} from '../src/cms/seed-content'
import {contentFields,fromPayloadContent,toPayloadContent} from '../src/cms/content-fields'

test('Couverture des contenus historiques : données métier, navigation et microtextes persistés avec isolation',async()=>{
  const dir=path.resolve('.data/tests/content-'+randomUUID());await mkdir(dir,{recursive:true})
  Object.assign(process.env,{PAYLOAD_SECRET:randomBytes(40).toString('hex'),DATABASE_URL:'file:'+path.join(dir,'cms.db').replaceAll('\\','/'),CMS_SCHEMA_PUSH:'true'})
  const {getCMS}=await import('../src/cms/payload');const {seedCMS}=await import('../scripts/cms-seed');const cms=await getCMS()
  try{
    await seedCMS(cms)
    assert.deepEqual(contentFields.filter(field=>'name'in field).map(field=>(field as {name:string}).name).sort(),Object.keys(defaultContent).sort())
    const before=fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false,locale:'fr'}))
    const edited=structuredClone(before)
    edited.hero.firstVerb='Recette éditoriale';edited.navigation.menuOpen='Ouvrir la navigation de recette';edited.footer.rightsLabel='Mention de recette';edited.ui.analyticsTitle='Choix de mesure de recette';edited.ui.closeLabel='Fermer la lecture de recette'
    edited.projects[0].title='Réalisation de recette';edited.testimonials[0].quote='Témoignage de recette isolée';edited.clients[0].name='Référence de recette';edited.stats.items[0].value=123;edited.stats.items[0].verified=true;edited.stats.items[0].source='Vérification locale fictive'
    edited.pricing.ctaLabel='Choisir la prestation de recette';edited.universes[0].title='Univers de recette';edited.identity.favicon='/favicon-recette.ico'
    await cms.updateGlobal({slug:'site-content',locale:'fr',draft:true,data:{...toPayloadContent(edited),_status:'draft'}})
    assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false,locale:'fr'})).projects[0].title,before.projects[0].title)
    const draft=fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:true,locale:'fr'}))
    assert.equal(draft.projects[0].title,edited.projects[0].title);assert.equal(draft.ui.analyticsTitle,edited.ui.analyticsTitle)
    await cms.updateGlobal({slug:'site-content',locale:'fr',draft:false,data:{...toPayloadContent(edited),_status:'published'}})
    const published=fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false,locale:'fr'}))
    for(const key of ['hero','navigation','footer','ui','pricing','identity'] as const)for(const [field,value] of Object.entries(edited[key]))if(['string','number','boolean'].includes(typeof value))assert.equal((published[key] as Record<string,unknown>)[field],value,`${key}.${field}`)
    assert.equal(published.testimonials[0].quote,edited.testimonials[0].quote);assert.equal(published.clients[0].name,edited.clients[0].name);assert.equal(published.stats.items[0].value,123);assert.equal(published.universes[0].title,edited.universes[0].title)
    assert.deepEqual(await seedCMS(cms),{created:0,existing:8});assert.equal(fromPayloadContent(await cms.findGlobal({slug:'site-content',draft:false})).projects[0].title,edited.projects[0].title)
  }finally{await cms.destroy()}
})
