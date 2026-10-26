/** Explicit read-only HTTPS acceptance check; never submits forms or sends mail. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
const base = new URL(process.env.CMS_CHECK_URL || 'https://mis-prod.fr')
if (base.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('HTTPS requis hors boucle locale.')
if (base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Fournir seulement une origine, sans identifiants.')
const required = process.env.CMS_CHECK_EXPECT_CMS === 'true'
const preproduction = process.env.CMS_CHECK_EXPECT_PREPRODUCTION === 'true'
const paths = ['/', '/institutions', '/entreprises', '/particuliers', '/contact', '/mentions-legales', '/confidentialite', '/cgv', '/admin/login', '/api/health', '/apercu/1', '/api/globals/site-content', '/atelier/1', '/api/client/files/1', '/robots.txt', '/sitemap.xml']
const results = []
for (const pathname of paths) {
  const response = await fetch(new URL(pathname, base), { redirect: 'manual', signal: AbortSignal.timeout(30000), cache: 'no-store' })
  const body = await response.text()
  const record = { path: pathname, status: response.status, contentType: response.headers.get('content-type'), cacheControl: response.headers.get('cache-control'), robots: response.headers.get('x-robots-tag'), location: response.headers.get('location'), sha256: createHash('sha256').update(body).digest('hex') }
  results.push(record)
  if (paths.indexOf(pathname) < 8) assert.equal(response.status, 200, pathname)
  if (required) {
    if (['/admin/login', '/api/health'].includes(pathname)) assert.equal(response.status, 200, pathname)
    if (['/apercu/1', '/api/globals/site-content', '/api/client/files/1'].includes(pathname)) assert.ok([401, 403, 404].includes(response.status), pathname)
    if (pathname === '/atelier/1') { assert.ok([302, 303, 307].includes(response.status)); assert.match(record.location || '', /login/) }
    if (preproduction) {
      assert.match(record.robots || '', /noindex/, pathname)
      if (pathname === '/robots.txt') assert.match(body, /Disallow:\s*\/\s*(?:$|\n)/)
      if (pathname === '/sitemap.xml') assert.ok(!body.includes('<loc>'), 'Sitemap de préproduction vide')
    }
  }
}
const report = { observedAt: new Date().toISOString(), origin: base.origin, context: required ? 'préproduction CMS à vérifier sur la cible indiquée' : 'observation initiale du site actif, sans mutation', expectCMS: required, expectPreproduction: preproduction, results }
const destination = process.env.CMS_CHECK_REPORT || 'docs/cms/preuves/preproduction-http.json'
await mkdir(new URL('.', new URL(destination, 'file:' + process.cwd().replaceAll('\\', '/') + '/')), { recursive: true })
await writeFile(destination, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
