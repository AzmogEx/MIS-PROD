/** Read-only CMS review. Produces a local decision register, never validates content. */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { getCMS } from '../src/cms/payload'
import { fromPayloadContent } from '../src/cms/content-fields'
import { diagnoseSite } from '../src/cms/diagnostics'

type Row = Record<string, unknown>
const object = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const array = (value: unknown): Row[] => Array.isArray(value) ? value.map(object) : []
const cell = (value: unknown) => String(value ?? 'Non renseigné').replaceAll('|', '\\|').replaceAll('\n', ' / ').replaceAll('\r', '')
const at = (source: unknown, field: string): unknown => field.replace(/\[(\d+)\]/g, (_, n) => '.' + (Number(n) - 1)).split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Row)[key] : undefined, source)
const describe = (value: unknown): string => typeof value === 'object' && value !== null ? Object.entries(object(value)).filter(([key, v]) => ['name','title','client','year','quote','author','role','organization','kicker','value','suffix','label','description','seed','format'].includes(key) && v !== undefined && v !== '').map(([key, v]) => `${key} : ${v}`).join(' ; ') : String(value ?? 'Non renseigné')
const cms = await getCMS()
try {
  const groups = [['site','identity','navigation','footer'],['hero','manifesto','stats','universesSection'],['universes','projects','portfolioSection'],['clients','testimonials','clientsSection','cta'],['universeTemplate','pricing','ui','notFound','translationState']]
  const content = async (draft: boolean, locale: 'fr' | 'en' = 'fr') => fromPayloadContent(Object.assign({}, ...await Promise.all(groups.map(fields => cms.findGlobal({ slug: 'site-content', draft, locale, depth: 0, overrideAccess: true, select: Object.fromEntries(fields.map(field => [field, true])) }))))) as unknown as Row
  const find = async (collection: string, draft = false) => {
    const result = await cms.find({ collection, draft, depth: 0, limit: 5000, locale: 'fr', overrideAccess: true, ...(!draft && ['pages','forms','shared-sections'].includes(collection) ? { where: { _status: { equals: 'published' } } } : {}) })
    if (result.hasNextPage) throw new Error(`Export incomplet : plus de 5000 ${collection}. Aucun registre produit.`)
    return result.docs as Row[]
  }
  const [published, draft, pages, draftPages, media, forms, sections, draftSections, redirects, enPages, enGlobal] = await Promise.all([
    content(false), content(true), find('pages'), find('pages', true), find('media'), find('forms'), find('shared-sections'), find('shared-sections', true), find('redirects'),
    cms.find({ collection: 'pages', locale: 'en', draft: false, limit: 5000, depth: 0, overrideAccess: true }),
    cms.findGlobal({ slug: 'site-content', locale: 'en', draft: false, depth: 0, overrideAccess: true, select: { translationState: true } }),
  ])
  const checkedAt = new Date().toISOString()
  const diagnostics = diagnoseSite({ published: { pages, content: published, sections }, draft: { pages: draftPages, content: draft, sections: draftSections }, media, forms, redirects, now: checkedAt }).filter(d => d.level === 'review')
  const entries = diagnostics.map(item => {
    const container = item.href.includes('/pages/') ? pages.find(p => String(p.id) === item.href.split('/').pop()) : published
    let current = at(container, item.field)
    if (item.code === 'demo-fallback') { const project = object(at(published, item.field.replace(/\.imageSrc$/, ''))); current = `Image non renseignée ; visuel de démonstration seed=${project.seed} ; projet=${project.title}` }
    const category = item.field.startsWith('clients') || item.field.startsWith('projects') && item.code !== 'demo-fallback' ? 'Référence commerciale' : item.field.startsWith('testimonials') ? 'Témoignage' : item.field.startsWith('stats') ? 'Chiffre' : /media|demo/.test(item.code) ? 'Visuel / droits' : /^site\.(legal|address|host)/.test(item.field) ? 'Mention légale' : 'Texte provisoire'
    const decision = category === 'Témoignage' ? 'Confirmer citation exacte, auteur, contexte et accord de diffusion ; sinon fournir un remplacement ou décider du retrait.' : category === 'Référence commerciale' ? 'Confirmer réalité, intitulé, prestations et droit de citer ; joindre la source ou décider correction/retrait.' : category === 'Chiffre' ? 'Fournir source, date, périmètre et calcul ; confirmer la valeur ou la corriger.' : category === 'Visuel / droits' ? 'Fournir le vrai visuel, ses crédits, autorisations et échéance ; décider de sa diffusion.' : 'Fournir la valeur officielle applicable ; faire relire avant publication.'
    const id = 'MIS-' + createHash('sha256').update(item.code + ':' + item.href + ':' + item.field).digest('hex').slice(0, 8).toUpperCase()
    const launchImpact = category === 'Mention légale' ? 'Valeur officielle à fournir avant bascule des mentions publiques ; recette isolée possible.' : 'Confirmer, corriger ou retirer cet élément avant sa diffusion publique dans la nouvelle version ; recette isolée possible.'
    return { id, category, field: item.field, source: item.source, href: item.href, current: describe(current), reason: item.detail, decision, launchImpact, status: 'À décider', scopes: item.scopes }
  })
  const lines = ['# Validation éditoriale MIS', '', `Observation réelle : ${checkedAt}. ${entries.length} signalements de niveau « à faire valider », issus des contenus de la base sélectionnée. Aucun contenu ni état de validation modifié.`, '',
    'Les identifiants ci-dessous restent stables tant que le champ et le motif restent identiques. Un signalement ne prouve pas que le contenu est faux. Les sources du dépôt qualifient explicitement clients/témoignages de données neutres ou fictives à valider (`src/data/clients.ts`) et les visuels de réalisations de remplacements Picsum (`src/data/portfolio.ts`).', '',
    '## Revue unique à organiser', '',
    'Le responsable MIS peut annoter chaque identifiant avec : confirmer + justificatif + date + validateur ; corriger + nouvelle valeur ; retirer de la diffusion ; ou différer avec responsable et échéance. Les autorisations et preuves privées restent dans le CMS, pas dans un rapport public. Ne cocher « vérifié » qu’après cette décision. Les changements se préparent en brouillon et se publient après contrôle.', '',
    '| Identifiant | Catégorie / emplacement | Texte ou valeur actuellement publiée | Motif | Décision attendue | Conséquence sur le lancement | État |', '| --- | --- | --- | --- | --- | --- | --- |']
  for (const entry of entries) lines.push(`| ${entry.id} | ${cell(entry.category)} · ${cell(entry.source)} · \`${cell(entry.field)}\` | ${cell(entry.current)} | ${cell(entry.reason)} | ${cell(entry.decision)} | ${cell(entry.launchImpact)} | À décider |`)
  lines.push('', '## Relectures complémentaires distinctes du compteur', '', 'Ces éléments ne sont pas artificiellement ajoutés aux signalements précédents. Ils demandent aussi une décision avant ouverture.', '', '### Tarifs et engagements', '', `Période affichée : **${cell(object(published.pricing).eyebrow)}**. Confirmer montants, inclusions, options, fiscalité, dates d’application et conditions de modification.`, '', '| Référence | Offre actuelle | Montant affiché | Décision |', '| --- | --- | --- | --- |')
  for (const service of array(object(published.pricing).services)) for (const formula of array(service.formulas)) lines.push(`| TARIF-${cell(service.key)}-${cell(formula.key)} | ${cell(service.label)} · ${cell(formula.name)} | ${cell(formula.price)} ${cell(object(published.pricing).currency)} | Confirmer montant et inclusions dans la fiche |`)
  for (const [i, addon] of array(object(published.pricing).addons).entries()) lines.push(`| OPTION-${i + 1} | ${cell(addon.label)} | ${cell(addon.price)} ${cell(object(published.pricing).currency)} | Confirmer option et conditions |`)
  lines.push('', '### Droits des médias importés', '', 'La présence d’un fichier déjà public ne constitue pas une preuve d’autorisation. Une restriction de sa copie CMS ne retire pas son ancienne URL statique. Examiner aussi les copies déjà téléchargées et les caches hors du contrôle de MIS.', '', '| Média | Fichier | Diffusion / échéance | Décision |', '| --- | --- | --- | --- |')
  for (const item of media) lines.push(`| MEDIA-${cell(item.id)} | ${cell(item.filename)} | ${cell(item.visibility)} / ${cell(item.rightsUntil || 'Non renseignée')} | Confirmer crédits, personnes, musique et droits ; définir échéance si nécessaire |`)
  lines.push('', '### Traductions', '', `État global anglais publié : **${cell(enGlobal.translationState || 'Non relu')}**. Le repli français ne constitue pas une traduction approuvée.`, '', '| Page | État anglais observé | Décision |', '| --- | --- | --- |')
  for (const page of enPages.docs) lines.push(`| ${cell(page.path)} | ${cell(page.translationState || 'Non relu')} | Traduire ou conserver le repli ; relecture humaine de la version source actuelle |`)
  lines.push('', '### Identité et corrections justifiables', '',
    '- L’hébergeur légal doit désigner l’entreprise qui héberge réellement les données. Coolify est le logiciel de déploiement confirmé, ce qui ne suffit pas pour remplacer automatiquement la mention OVH héritée.',
    '- Les visuels Picsum sont déclarés comme provisoires par le dépôt : proposer leur remplacement par des images fournies et autorisées ; aucun retrait arbitraire effectué.',
    '- Les liens sociaux génériques et coordonnées provisoires doivent être remplacés par les adresses officielles fournies par MIS. Ne pas les deviner.',
    '- Les promesses de délai, performances et conditions des CGV restent à confirmer par le métier ; ce rapport ne les certifie pas.', '',
    'Pour préparer une seule revue, regrouper : références et témoignages ; chiffres et tarifs ; droits médias ; identité légale et liens ; traductions. Le développement technique peut continuer indépendamment de ces décisions.', '',
    '## Traçabilité', '', 'Export reproductible : `npx tsx --env-file-if-exists=.env.local scripts/cms-editorial-review.ts`. Le fichier existant est préservé par défaut ; `--refresh` le régénère explicitement et efface ses annotations locales. Archiver une revue annotée avant régénération. Les preuves complètes de champs et motifs se trouvent dans `preuves/validation-editoriale.json`.')
  await mkdir('docs/cms/preuves', { recursive: true })
  const flag = process.argv.includes('--refresh') ? 'w' : 'wx'
  await writeFile('docs/cms/VALIDATION-EDITORIALE.md', lines.join('\n') + '\n', { flag })
  await writeFile('docs/cms/preuves/validation-editoriale.json', JSON.stringify({ checkedAt, entries }, null, 2) + '\n', { flag })
  console.log(JSON.stringify({ checkedAt, findings: entries.length, byCategory: Object.fromEntries([...new Set(entries.map(e => e.category))].map(c => [c, entries.filter(e => e.category === c).length])), document: 'docs/cms/VALIDATION-EDITORIALE.md' }))
} finally { await cms.destroy() }
