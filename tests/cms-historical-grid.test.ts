import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload, type PayloadRequest } from 'payload'
import { sqliteAdapter, sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-sqlite'
import sharp from 'sharp'
import { coreCollections, siteContent } from '../src/cms/collections'
import { SubmissionLimits } from '../src/cms/operation-collections'
import { migrations } from '../src/migrations'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { defaultContent } from '../src/cms/seed-content'
import { fromPayloadContent, toPayloadContent } from '../src/cms/content-fields'
import { PageRenderer } from '../src/components/cms/page-renderer'
import { SiteContentProvider } from '../src/components/cms/content-context'
import type { PageBlock } from '../src/cms/page-types'

const content = { ...defaultContent, projects: [], universes: defaultContent.universes.map(universe => ({ ...universe, card: { ...universe.card, imageSrc: '' }, portfolio: [] })) }
const render = (layout: PageBlock[]) => renderToStaticMarkup(createElement(SiteContentProvider, { content } as unknown as Parameters<typeof SiteContentProvider>[0], createElement(PageRenderer, { page: { title: 'Grilles', layout } })))
test('les huit grilles historiques activent la variante seulement sur choix explicite', () => {
  const blocks: PageBlock[] = ['manifesto', 'stats', 'universes', 'portfolio', 'clients', 'pricing', 'universe'].map(blockType => ({ blockType, universeSlug: 'institutions' }))
  const original = render(blocks)
  assert.equal((original.match(/data-cms-grid="original"/g) || []).length, 8)
  assert.doesNotMatch(original, /data-cms-grid="uniform"/)
  const uniform = render(blocks.map(block => ({ ...block, appearance: { gridLayout: 'uniform', columns: 1, tabletColumns: 2, mobileColumns: 1 } })))
  assert.equal((uniform.match(/data-cms-grid="uniform"/g) || []).length, 8)
  assert.match(uniform, /--cms-columns:1;--cms-tablet-columns:2;--cms-mobile-columns:1/)
  assert.match(uniform, /md:grid-cols-12/) // Editorial headers keep their original grid.
})
test('une section synchronisée originale ne récupère pas accidentellement la variante de son parent', () => {
  const html = render([{ blockType: 'shared', appearance: { gridLayout: 'uniform' }, section: { id: 1, layout: [{ blockType: 'stats', appearance: { gridLayout: 'original' } }, { blockType: 'manifesto', appearance: { gridLayout: 'uniform', columns: 2 } }] } }])
  assert.equal((html.match(/data-cms-grid="original"/g) || []).length, 1); assert.equal((html.match(/data-cms-grid="uniform"/g) || []).length, 1)
})

test('migration réelle : grille et identité restent isolées entre brouillon, public et versions restaurées', async t => {
  await mkdir('.data', { recursive: true }); const directory = await mkdtemp(path.resolve('.data/test-historical-grid-'))
  const cms = await getPayload({ config: await buildConfig({ secret: randomBytes(48).toString('hex'), onInit: installTransactionQueue, telemetry: false, sharp, logger: { options: { level: 'fatal' } }, admin: { disable: true }, graphQL: { disable: true }, typescript: { autoGenerate: false }, localization: { locales: ['fr', 'en'], defaultLocale: 'fr' }, db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}` }, push: false, transactionOptions: { behavior: 'immediate' } }), collections: [...coreCollections, SubmissionLimits], globals: [siteContent] }) })
  try {
    await cms.db.migrate({ migrations: migrations.map(migration => ({ name: migration.name, up: (args: unknown) => migration.up(args as MigrateUpArgs), down: (args: unknown) => migration.down(args as MigrateDownArgs) })) })
    const tables = await cms.db.drizzle.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table' AND name IN (SELECT m.name FROM sqlite_master m JOIN pragma_table_info(m.name) p ON p.name='appearance_grid_layout')`)
    assert.equal(tables.length, 83)
    const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { email: 'grid-owner@example.test', name: 'Recette grille', password: randomBytes(24).toString('hex'), role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
    const access = { user: owner, overrideAccess: false }
    await cms.updateGlobal({ slug: 'site-content', data: { ...toPayloadContent(defaultContent), _status: 'published' }, ...access })
    const page = await cms.create({ collection: 'pages', data: { title: 'Grille', path: '/recette-grille-isolee', layout: [{ blockType: 'stats' }], _status: 'published' }, ...access })
    const initial = (await cms.findVersions({ collection: 'pages', where: { parent: { equals: page.id } }, sort: '-createdAt', limit: 1, ...access })).docs[0]
    const uniform = [{ blockType: 'stats', appearance: { gridLayout: 'uniform', columns: 1, tabletColumns: 2, mobileColumns: 1 } }]
    await t.test('brouillon, publication et restauration préservent les modes et les trois largeurs', async () => {
      await cms.update({ collection: 'pages', id: page.id, draft: true, data: { layout: uniform }, ...access })
      assert.equal((await cms.findByID({ collection: 'pages', id: page.id, draft: false, depth: 0 })).layout[0].appearance.gridLayout, 'original')
      const draft = await cms.findByID({ collection: 'pages', id: page.id, draft: true, depth: 0 }); assert.equal(draft.layout[0].appearance.gridLayout, 'uniform'); assert.equal(draft.layout[0].appearance.columns, 1); assert.equal(draft.layout[0].appearance.tabletColumns, 2)
      await cms.update({ collection: 'pages', id: page.id, data: { layout: uniform, _status: 'published' }, ...access })
      assert.equal((await cms.findByID({ collection: 'pages', id: page.id, draft: false, depth: 0 })).layout[0].appearance.gridLayout, 'uniform')
      await cms.restoreVersion({ collection: 'pages', id: initial.id, ...access })
      assert.equal((await cms.findByID({ collection: 'pages', id: page.id, draft: false, depth: 0 })).layout[0].appearance.gridLayout, 'original')
      await assert.rejects(cms.update({ collection: 'pages', id: page.id, data: { layout: [{ blockType: 'stats', appearance: { gridLayout: 'arbitrary-css' } }] }, ...access }))
    })
    await t.test('sections et modèles gardent le réglage, leurs brouillons restent privés', async () => {
      const shared = await cms.create({ collection: 'shared-sections', data: { title: 'Statistiques partagées', layout: [{ blockType: 'stats' }], _status: 'published' }, ...access })
      await cms.update({ collection: 'shared-sections', id: shared.id, draft: true, data: { layout: uniform }, ...access })
      assert.equal((await cms.findByID({ collection: 'shared-sections', id: shared.id, draft: false, depth: 0 })).layout[0].appearance.gridLayout, 'original')
      assert.equal((await cms.findByID({ collection: 'shared-sections', id: shared.id, draft: true, depth: 0 })).layout[0].appearance.gridLayout, 'uniform')
      const template = await cms.create({ collection: 'section-templates', data: { title: 'Grille régulière', layout: uniform }, ...access }); assert.equal(template.layout[0].appearance.gridLayout, 'uniform')
    })
    await t.test('les nouvelles adresses logo/favicon ne modifient pas la globale publiée avant publication', async () => {
      const changed = structuredClone(defaultContent); changed.identity.favicon = '/api/media/file/recette-icone.png'; changed.navigation.logoImage = '/api/media/file/recette-logo.svg'
      await cms.updateGlobal({ slug: 'site-content', draft: true, data: toPayloadContent(changed), ...access })
      const published = fromPayloadContent(await cms.findGlobal({ slug: 'site-content', draft: false, depth: 0 })); const draft = fromPayloadContent(await cms.findGlobal({ slug: 'site-content', draft: true, depth: 0 }))
      assert.equal(published.identity.favicon, defaultContent.identity.favicon); assert.equal(published.navigation.logoImage, defaultContent.navigation.logoImage); assert.equal(draft.identity.favicon, changed.identity.favicon); assert.equal(draft.navigation.logoImage, changed.navigation.logoImage)
    })
  } finally {
    ;(cms.db as unknown as { client?: { close(): void } }).client?.close(); await cms.destroy()
    assert.ok(directory.startsWith(path.resolve('.data') + path.sep)); await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => undefined)
  }
})
