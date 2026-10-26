import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload, handleEndpoints, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { coreCollections, siteContent } from '../src/cms/collections'
import { operationCollections } from '../src/cms/operation-collections'
import { getPublishedForm, seedOperations, submitBrief, SubmissionError } from '../src/cms/operations'
import { formTranslationEntries, type FormTranslations } from '../src/cms/form-translations'
import { fromPayloadContent, toPayloadContent } from '../src/cms/content-fields'
import { defaultContent } from '../src/cms/seed-content'
import { initialBriefForm, type PublicForm } from '../src/cms/form-schema'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { restoreRelease, saveEditor } from '../src/cms/editor-service'

test('Traductions réelles : relecture, repli, snapshot du brief et édition EN isolée', async t => {
  await mkdir('.data', { recursive: true })
  const directory = await mkdtemp(path.resolve('.data/test-translations-'))
  const config = await buildConfig({
    secret: randomBytes(48).toString('hex'), telemetry: false, admin: { disable: true }, onInit: installTransactionQueue,
    serverURL: 'http://localhost:4419', logger: { options: { level: 'fatal' } }, typescript: { autoGenerate: false }, graphQL: { disable: true },
    localization: { locales: ['fr', 'en'], defaultLocale: 'fr', fallback: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}` }, push: true, wal: true, busyTimeout: 10000, transactionOptions: { behavior: 'immediate' } }),
    collections: [...coreCollections, ...operationCollections], globals: [siteContent],
  })
  const cms = await getPayload({ config })
  const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { email: 'translation-owner@example.test', password: randomBytes(25).toString('hex'), name: 'Recette traduction', role: 'owner' } }), collection: 'users' } as NonNullable<PayloadRequest['user']>
  const access = { user: owner, overrideAccess: false }
  await seedOperations(cms)
  const source = await cms.create({ collection: 'forms', data: { ...initialBriefForm, slug: 'translation-test', title: 'Formulaire français', steps: [{ key: 'main', title: 'Votre demande' }], fields: [{ key: 'name', label: 'Votre nom', type: 'text', step: 'main', required: true }, { key: 'email', label: 'Courriel', type: 'email', step: 'main', required: true }], notification: { enabled: false }, _status: 'published' }, ...access })
  const key = randomBytes(18).toString('hex')
  const input = { body: { formSlug: 'translation-test', locale: 'en', answers: { name: 'Recette', email: 'translation@example.test' } }, idempotencyKey: key, rateKey: key }
  const reviewed = async () => {
    const current = await cms.findByID({ collection: 'forms', id: source.id, draft: true, ...access })
    const values = Object.fromEntries(Object.entries(formTranslationEntries(current as unknown as PublicForm)).map(([key, value]) => [key, value ? `EN ${value}` : '']))
    values['texts.successTitle'] = 'Request received'; values['field.name.label'] = 'Your name'; values['ui.invalidEmail'] = 'invalid email address.'
    return cms.update({ collection: 'forms', id: source.id, data: { translations: { en: { values, state: 'reviewed' } }, _status: 'published' }, ...access })
  }
  try {
    await t.test('une traduction non relue reste privée et le public reçoit le français', async () => {
      await cms.update({ collection: 'forms', id: source.id, data: { translations: { en: { values: { title: 'Secret English draft' }, state: 'draft' } }, _status: 'published' }, ...access })
      const form = (await getPublishedForm(cms, source.slug, 'en'))!
      assert.equal(form.locale, 'fr'); assert.equal(form.title, source.title)
      const response = await handleEndpoints({ config, request: new Request(`${config.serverURL}/api/forms/${source.id}`) })
      const json = await response.json(); assert.equal(response.status, 200); assert.equal('translations' in json, false)
      await assert.rejects(cms.update({ collection: 'forms', id: source.id, data: { translations: { en: { values: { title: 'Incomplete' }, state: 'reviewed' } } }, ...access }), /incomplète/)
    })
    await t.test('anglais relu, erreurs traduites et schéma exact durable dans la demande', async () => {
      await reviewed()
      const form = (await getPublishedForm(cms, source.slug, 'en'))!
      assert.equal(form.locale, 'en'); assert.equal(form.translationState, 'reviewed'); assert.equal(form.fields[0].label, 'Your name')
      await assert.rejects(submitBrief(cms, { ...input, idempotencyKey: randomBytes(18).toString('hex'), body: { ...input.body, answers: { name: 'Recette', email: 'invalid' } } }), error => error instanceof SubmissionError && /invalid email address/.test(error.fields?.email || ''))
      assert.equal((await submitBrief(cms, input)).confirmation, 'Request received')
      const brief = (await cms.find({ collection: 'briefs', limit: 1 })).docs[0]
      assert.equal((brief.schemaSnapshot as PublicForm).locale, 'en')
      assert.equal((brief.schemaSnapshot as PublicForm).texts.successTitle, 'Request received')
    })
    await t.test('modifier le français rend EN obsolète ; le retry garde le schéma reçu même après archivage', async () => {
      const current = await cms.findByID({ collection: 'forms', id: source.id, ...access })
      const changed = await cms.update({ collection: 'forms', id: source.id, data: { fields: [...current.fields, { key: 'newQuestion', label: 'Nouvelle question obligatoire', type: 'text', step: 'main', required: true }], _status: 'published' }, ...access })
      assert.equal((changed.translations as FormTranslations).en?.state, 'outdated')
      assert.equal((await getPublishedForm(cms, source.slug, 'en'))?.locale, 'fr')
      assert.equal((await submitBrief(cms, input)).duplicate, true)
      await cms.update({ collection: 'forms', id: source.id, data: { deletedAt: new Date().toISOString() }, ...access })
      assert.equal(await getPublishedForm(cms, source.slug, 'en'), null)
      assert.equal((await submitBrief(cms, input)).duplicate, true)
      assert.equal((await cms.count({ collection: 'briefs' })).totalDocs, 1)
    })
    await t.test('atelier EN sauvegarde et restaure uniquement les valeurs localisées anglaises', async () => {
      await cms.updateGlobal({ slug: 'site-content', locale: 'fr', data: { ...toPayloadContent(defaultContent), _status: 'published' }, ...access })
      const page = await cms.create({ collection: 'pages', locale: 'fr', data: { title: 'Page française', path: '/langues-recette', layout: [{ blockType: 'editorial', body: 'Texte français' }], _status: 'published' }, ...access })
      const work = async () => ({ page: await cms.findByID({ collection: 'pages', id: page.id, locale: 'en', draft: true, ...access }), content: await cms.findGlobal({ slug: 'site-content', locale: 'en', draft: true, ...access }) })
      let current = await work()
      const content = fromPayloadContent(current.content); content.hero.firstVerb = 'English introduction'
      await saveEditor(cms, owner, Number(page.id), { locale: 'en', pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, layout: [{ ...current.page.layout[0], body: 'English copy' }], content })
      assert.equal((await work()).page.layout[0].body, 'English copy')
      assert.equal((await cms.findByID({ collection: 'pages', id: page.id, locale: 'fr', draft: true, ...access })).layout[0].body, 'Texte français')
      assert.equal(fromPayloadContent(await cms.findGlobal({ slug: 'site-content', locale: 'fr', draft: true, ...access })).hero.firstVerb, defaultContent.hero.firstVerb)
      current = await work(); await saveEditor(cms, owner, Number(page.id), { locale: 'en', pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, publish: true })
      const release = (await cms.find({ collection: 'publication-releases', limit: 1, sort: '-id' })).docs[0]
      assert.equal((release.pageSnapshot as Record<string, unknown>)._locale, 'en')
      current = await work(); await saveEditor(cms, owner, Number(page.id), { locale: 'en', pageUpdatedAt: current.page.updatedAt, contentUpdatedAt: current.content.updatedAt, layout: [{ ...current.page.layout[0], body: 'Changed English draft' }] })
      await restoreRelease(cms, owner, release.id)
      assert.equal((await work()).page.layout[0].body, 'English copy')
      assert.equal((await cms.findByID({ collection: 'pages', id: page.id, locale: 'fr', draft: true, ...access })).layout[0].body, 'Texte français')
    })
  } finally {
    (cms.db as unknown as { client?: { close: () => void } }).client?.close(); await cms.destroy()
    if (directory.startsWith(path.resolve('.data') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => {})
  }
})
