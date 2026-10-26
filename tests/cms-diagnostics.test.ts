import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diagnoseSite, diagnoseIntegrations, getSiteDiagnostics, type DiagnosticsInput } from '../src/cms/diagnostics'
import type { Payload } from 'payload'
import { defaultContent } from '../src/cms/seed-content'

const content = { site: { url: 'https://mis.example', address: { street: '1 rue du Studio' }, legal: { siret: '12345678901234', director: 'Équipe MIS' } }, navigation: { links: [{ href: '/contact' }] } }
function input(): DiagnosticsInput {
  const pages = [{ id: 1, title: 'Accueil', path: '/', _status: 'published', layout: [{ blockType: 'editorial', link: '/contact' }] }, { id: 2, title: 'Contact', path: '/contact', _status: 'published', layout: [{ blockType: 'contact', formSlug: 'brief-projet' }] }]
  return { published: { pages, content }, draft: { pages: structuredClone(pages), content: structuredClone(content) }, media: [], forms: [{ slug: 'brief-projet', _status: 'published' }], now: '2026-10-25T12:00:00Z' }
}

test('un contenu minimal cohérent ne fabrique ni score ni diagnostic', () => { assert.deepEqual(diagnoseSite(input()), []) })
test('les versions publiée et de travail restent distinctes', () => {
  const data = input(); data.draft.pages[0].layout = [{ blockType: 'editorial', link: '/absente' }]
  const result = diagnoseSite(data).find(item => item.code === 'broken-link')!
  assert.deepEqual(result.scopes, ['draft']); assert.equal(result.href, '/admin/collections/pages/1')
})
test('les liens, redirections, ancres et cycles orphelins sont réellement résolus', () => {
  const data = input()
  data.published.pages[0].layout = [{ blockType: 'editorial', link: '/ancienne#details' }, { blockType: 'editorial', link: '/contact#absent' }, { blockType: 'editorial', link: 'https://external.example/absente' }]
  data.published.pages[1].layout = [{ blockType: 'contact', formSlug: 'brief-projet', anchor: 'details' }]
  data.published.pages.push({ id: 3, title: 'A', path: '/a', _status: 'published', layout: [{ blockType: 'editorial', link: '/b' }] }, { id: 4, title: 'B', path: '/b', _status: 'published', layout: [{ blockType: 'editorial', link: '/a' }] })
  data.redirects = [{ from: '/ancienne', to: '/contact' }]
  const results = diagnoseSite(data)
  assert.equal(results.filter(item => item.code === 'broken-link').length, 0)
  assert.equal(results.filter(item => item.code === 'broken-anchor').length, 1)
  assert.equal(results.filter(item => item.code === 'orphan-page').length, 2)
})
test('les médias absents, restreints, expirés et fichiers locaux sont signalés sans requête distante', () => {
  const data = input()
  data.published.pages[0].layout = [{ blockType: 'gallery', items: [{ media: 8 }, { media: 99 }, { media: '/missing.png' }, { media: 'https://external.example/image.png' }] }]
  data.media = [{ id: 8, filename: 'image.png', visibility: 'restricted', rightsUntil: '2026-01-01T00:00:00Z' }]
  data.files = { 'media:8': false, '/missing.png': false }
  const codes = diagnoseSite(data).map(item => item.code)
  for (const code of ['media-expired', 'media-restricted', 'media-file-missing', 'media-reference-missing', 'local-file-missing', 'library-file-missing']) assert.ok(codes.includes(code))
})
test('les blocs masqués ne produisent pas de faux média manquant', () => {
  const data = input(); data.published.pages[0].layout = [{ blockType: 'gallery', hidden: true, items: [{ media: 44 }] }]
  assert.equal(diagnoseSite(data).filter(item => item.code === 'media-reference-missing').length, 0)
})
test('les preuves commerciales et variables légales sont contrôlées et dédupliquées', () => {
  const data = input()
  data.published.content = { ...content, stats: { items: [{ value: 500, verified: false }] }, site: { ...content.site, legal: { director: '[À COMPLÉTER]', siret: '' } } }
  data.published.pages[0].layout = [{ blockType: 'stats' }, { blockType: 'legal', sections: [{ text: 'Contact {{site.email}}' }] }]
  data.draft = structuredClone(data.published)
  const results = diagnoseSite(data)
  assert.deepEqual(results.find(item => item.code === 'unverified-claim')!.scopes, ['published', 'draft'])
  assert.ok(results.some(item => item.code === 'placeholder'))
  assert.ok(results.some(item => item.code === 'legal-missing'))
  assert.ok(results.some(item => item.code === 'legal-token-empty'))
})
test('les formulaires en brouillon ne sont pas annoncés comme accessibles', () => {
  const data = input(); data.forms[0]._status = 'draft'
  const results = diagnoseSite(data)
  assert.ok(results.some(item => item.code === 'form-unavailable')); assert.ok(results.some(item => item.code === 'contact-missing'))
})
test('une preuve sans case verified reste à vérifier', () => {
  const data = input(); data.published.pages[0].layout = [{ blockType: 'stats' }]
  data.published.content = { ...content, stats: { items: [{ value: 200 }] } }
  assert.ok(diagnoseSite(data).some(item => item.code === 'unverified-claim'))
})
test('une section synchronisée apporte ses ancres et ses références', () => {
  const data = input(); data.published.pages[0].layout = [{ blockType: 'shared', section: 5 }, { blockType: 'editorial', link: '/#partage' }]
  data.published.sections = [{ id: 5, title: 'Partage', layout: [{ blockType: 'editorial', anchor: 'partage', media: 55 }] }]
  const results = diagnoseSite(data)
  assert.ok(!results.some(item => item.code === 'broken-anchor'))
  assert.equal(results.find(item => item.code === 'media-reference-missing')!.href, '/admin/collections/shared-sections/5')
})
test('les statuts d’exploitation ne révèlent aucun secret et ne prétendent pas tester le fournisseur', () => {
  const result = diagnoseIntegrations({ CMS_EMAIL_DELIVERY: 'enabled', RESEND_API_KEY: 'never-print-secret', CONTACT_SENDER: 'private-address', OLLAMA_BASE_URL: 'http://127.0.0.1:11434' }, { enabled: true, model: 'llama3' }, undefined)
  assert.equal(result.find(item => item.key === 'email')!.state, 'Envoi réel autorisé')
  assert.equal(result.find(item => item.key === 'backup')!.state, 'État inconnu')
  assert.equal(result.find(item => item.key === 'ollama')!.state, 'Configurée, disponibilité inconnue')
  assert.ok(!JSON.stringify(result).includes('never-print-secret')); assert.ok(!JSON.stringify(result).includes('private-address'))
})
test('une sauvegarde terminée exige un journal daté valide', () => {
  const now = new Date('2026-10-25T12:00:00Z')
  for (const report of [{ completedAt: now.toISOString() }, { status: 'failed', completedAt: now.toISOString() }, { status: 'completed', completedAt: 'invalid' }, { status: 'completed', completedAt: '2030-01-01T00:00:00Z' }]) assert.equal(diagnoseIntegrations({}, {}, report, now).find(item => item.key === 'backup')!.state, 'État inconnu')
  assert.match(diagnoseIntegrations({}, {}, { status: 'completed', completedAt: now.toISOString() }, now).find(item => item.key === 'backup')!.state, /Terminée le/)
})
test('l’autorisation est vérifiée avant toute lecture des données', async () => {
  const payload = {} as Payload
  for (const user of [null, { id: 1, role: 'sales' as const }, { id: 2, role: 'client' as const }, { id: 3, role: 'contributor' as const }]) await assert.rejects(getSiteDiagnostics(payload, user), /Accès réservé/)
})
test('les chemins et ancres du contenu historique restent reconnus', () => {
  const data = input()
  data.published.content = structuredClone(defaultContent) as unknown as Record<string, unknown>
  data.published.pages[0].layout = ['hero', 'manifesto', 'stats', 'universes', 'portfolio', 'clients', 'cta'].map(blockType => ({ blockType }))
  for (const [index, path] of ['/institutions', '/entreprises', '/particuliers', '/mentions-legales', '/confidentialite', '/cgv'].entries()) data.published.pages.push({ id: index + 3, title: path, path, _status: 'published', layout: [] })
  data.draft = structuredClone(data.published)
  const findings = diagnoseSite(data)
  assert.deepEqual(findings.filter(item => ['broken-link', 'broken-anchor', 'orphan-page'].includes(item.code)), [])
  assert.ok(findings.some(item => item.code === 'unverified-claim'))
  assert.ok(findings.some(item => item.code === 'placeholder'))
})
