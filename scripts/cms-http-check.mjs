import assert from 'node:assert/strict'
const base=process.env.CMS_CHECK_URL||'http://127.0.0.1:3100'
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname))throw new Error('Recette réservée au serveur local.')
for(const pathname of ['/','/institutions','/entreprises','/particuliers','/contact','/mentions-legales','/confidentialite','/cgv','/en']){
  const response=await fetch(base+pathname)
  const html=await response.text()
  assert.equal(response.status,200,pathname)
  assert.match(html,/application\/ld\+json/,pathname)
  assert.ok(!html.includes('Application error'),pathname)
  console.log(`OK ${pathname}`)
}
for(const pathname of ['/apercu/1','/api/globals/site-content']){
  const response=await fetch(base+pathname,{redirect:'manual'})
  assert.ok([401,403,404].includes(response.status),pathname+' doit rester privé')
  console.log(`PROTÉGÉ ${pathname} (${response.status})`)
}
const studio=await fetch(base+'/atelier/1',{redirect:'manual'})
assert.ok([302,303,307].includes(studio.status))
assert.match(studio.headers.get('location')||'',/login/)
const missing=await fetch(base+'/page-inexistante-recette')
assert.equal(missing.status,404)
const sitemap=await(await fetch(base+'/sitemap.xml')).text()
assert.match(sitemap,/<urlset/)
assert.ok(!sitemap.includes('/apercu/'))
assert.ok(!sitemap.includes('/admin'))
const robots=await(await fetch(base+'/robots.txt')).text()
assert.match(robots,/Disallow: \/apercu/)
console.log('OK 404, sitemap et robots privés')
