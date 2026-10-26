import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PageRenderer } from '../src/components/cms/page-renderer'
import { SiteContentProvider } from '../src/components/cms/content-context'
import { defaultContent } from '../src/cms/seed-content'
import type { PageBlock } from '../src/cms/page-types'

// Heading tests do not need gallery assets or Next's image runtime.
const content = { ...defaultContent, universes: defaultContent.universes.map(universe => ({ ...universe, portfolio: [] })) }
const render = (layout: PageBlock[]) => renderToStaticMarkup(<SiteContentProvider content={content}><PageRenderer page={{ title: 'Titre de la page', layout }} /></SiteContentProvider>)
const single = (html: string) => { assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1); return html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)![1] }

test('la réorganisation éditorial / hero conserve un seul titre principal et les espacements', () => {
  const first = render([{ blockType: 'editorial', title: 'Introduction ajoutée' }, { blockType: 'hero' }])
  assert.equal(single(first), 'Introduction ajoutée'); assert.match(first, /<h1 style="padding-top:40px">/); assert.match(first, /<h2 class="font-serif text-balance/)
  const reordered = render([{ blockType: 'hero' }, { blockType: 'editorial', title: 'Introduction ajoutée' }])
  assert.doesNotMatch(single(reordered), /Introduction ajoutée/); assert.match(reordered, /<h2 style="padding-top:0">Introduction ajoutée/)
})

test('les blocs masqués et titres absents ne consomment pas le titre principal', () => {
  assert.equal(single(render([{ blockType: 'hero', hidden: true }, { blockType: 'editorial', body: 'Sans titre' }, { blockType: 'editorial', title: 'Titre visible' }])), 'Titre visible')
  const fallback = render([{ blockType: 'hero', hidden: true }, { blockType: 'contact' }]); assert.equal(single(fallback), 'Titre de la page'); assert.match(fallback, /<h1 class="sr-only">/)
})

test('sections synchronisées, doublons, univers et légal partagent la même hiérarchie', () => {
  const section = { id: 7, layout: [{ blockType: 'editorial', title: 'Titre partagé' }, { blockType: 'hero' }] }
  assert.equal(single(render([{ blockType: 'shared', section }, { blockType: 'shared', section }, { blockType: 'universe', universeSlug: 'institutions' }, { blockType: 'legal', title: 'Mentions légales' }])), 'Titre partagé')
  assert.ok(single(render([{ blockType: 'universe', universeSlug: 'institutions' }, { blockType: 'hero' }])).length)
  assert.equal(single(render([{ blockType: 'legal', title: 'Mentions légales' }, { blockType: 'hero' }])), 'Mentions légales')
})

test('une composition de blocs génériques promeut son premier titre sans marge supplémentaire', () => {
  const html = render([{ blockType: 'gallery', title: 'Galerie' }, { blockType: 'faq', title: 'Questions' }, { blockType: 'columns', title: 'Équipe', items: [{ blockType: 'editorial', title: 'Portrait' }] }])
  assert.equal(single(html), 'Galerie'); assert.match(html, /<h1 style="padding-top:0">Galerie/); assert.match(html, /<h2 style="padding-top:0">Questions/)
})
