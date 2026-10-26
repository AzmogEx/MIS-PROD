import { getCMS } from '../src/cms/payload'
import { toPayloadContent } from '../src/cms/content-fields'
import { defaultContent } from '../src/cms/seed-content'
import { seedOperations } from '../src/cms/operations'
import legalPages from '../src/cms/legal-seed.json'
import type { Payload } from 'payload'

export async function seedCMS(payload: Payload) {
  // Never update existing editorial records. Source keys are stable across reruns.
  const existingGlobal = await payload.findGlobal({ slug: 'site-content', depth: 0, draft: true })
  if (!existingGlobal.updatedAt) await payload.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(defaultContent), _status: 'published' } })
  const sources = [
    { path: '/', title: 'Accueil', layout: ['hero', 'manifesto', 'stats', 'universes', 'portfolio', 'clients', 'cta'].map(blockType => ({ blockType })) },
    ...defaultContent.universes.map(u => ({ path: `/${u.slug}`, title: u.eyebrow, layout: [{ blockType: 'universe', universeSlug: u.slug }], kind: 'universe' })),
    { path: '/contact', title: 'Contact — Brief projet', layout: [{ blockType: 'editorial', eyebrow: '(Brief projet)', title: 'Trois étapes.\nQuatre minutes.', body: "Pour les urgences, écrivez-nous à contact@mis-prod.fr — sinon, ce formulaire est le moyen le plus efficace pour qu'on prépare votre dossier en amont.", linkLabel: 'contact@mis-prod.fr', link: 'mailto:contact@mis-prod.fr' }, { blockType: 'contact', formSlug: 'brief-projet' }] },
    ...legalPages.map(p => ({ path: `/${p.slug}`, title: p.title, layout: [p], kind: 'legal' })),
  ]
  let created = 0
  for (const source of sources) {
    const sourceKey = `legacy:e366c51:${source.path}`
    const existing = await payload.find({ collection: 'pages', where: { or: [{ sourceKey: { equals: sourceKey } }, { path: { equals: source.path } }] }, limit: 1, depth: 0, draft: true, trash: true })
    if (existing.docs.length) continue
    await payload.create({ collection: 'pages', data: { ...source, sourceKey, _status: 'published', provenance: 'Import non destructif du dépôt e366c51. Les références commerciales et chiffres hérités nécessitent validation.', seo: { title: source.title, description: source.path === '/' ? defaultContent.site.tagline : source.title } } })
    created++
  }
  await seedOperations(payload)
  return { created, existing: sources.length - created }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/cms-seed.ts')) {
  const payload = await getCMS()
  console.log(JSON.stringify(await seedCMS(payload)))
  await payload.destroy()
}
