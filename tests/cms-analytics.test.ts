import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createAnalyticsRuntime, isAnalyticsKey, progressMarkers, classifyAcquisition, type AnalyticsPayload } from '../src/cms/analytics-events'

function fixture(enabled = true) {
  const calls: { body: AnalyticsPayload; signal: AbortSignal }[] = []
  let now = 1_000_000
  const runtime = createAnalyticsRuntime({ enabled, randomID: randomUUID, device: () => 'desktop', now: () => now,
    send: async (body, signal) => { calls.push({ body, signal }); await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true })) },
  })
  runtime.navigate('page-1')
  return { runtime, calls, advance: () => { now += 60_000 } }
}

test('Aucun événement avant consentement, après refus, ni après activation globale absente', () => {
  const { runtime, calls } = fixture()
  assert.equal(runtime.track('page_view'), false)
  runtime.choose('refused')
  assert.equal(runtime.track('form_start'), false)
  assert.equal(calls.length, 0)
  runtime.choose('accepted')
  assert.equal(calls.length, 0, 'Aucune file d’événements antérieurs au consentement')
  assert.equal(runtime.track('page_view'), true)
  assert.equal(calls.length, 1)
  runtime.abort()
  const disabled = fixture(false)
  disabled.runtime.choose('accepted')
  assert.equal(disabled.runtime.track('page_view'), false)
  assert.equal(disabled.calls.length, 0)
})

test('Retirer l’accord annule les requêtes et empêche les événements suivants', () => {
  const { runtime, calls } = fixture()
  runtime.choose('accepted')
  runtime.track('video_play_manual')
  assert.equal(calls[0].signal.aborted, false)
  runtime.choose('refused')
  assert.equal(calls[0].signal.aborted, true)
  assert.equal(runtime.track('video_progress', { step: 25 }), false)
  assert.equal(calls.length, 1)
})

test('Payload strict : aucune URL, réponse, identité ou identifiant visiteur', () => {
  const { runtime, calls } = fixture()
  runtime.choose('accepted')
  assert.equal(runtime.track('page_view', { key: '/contact?email=secret@example.test' }), false)
  assert.equal(runtime.track('form_step', { key: 'form-5', step: 101 }), false)
  assert.equal(runtime.track('form_step', { key: 'form-5', step: 2, once: 'local-dedupe' }), true)
  runtime.track('contact_click')
  const first = calls[0].body
  assert.deepEqual(Object.keys(first).sort(), ['consent', 'device', 'event', 'eventId', 'pageKey', 'step'])
  assert.equal(first.pageKey, 'form-5')
  assert.notEqual(first.eventId, calls[1].body.eventId, 'Un identifiant nouveau par événement, aucun lien visiteur')
  assert.equal(JSON.stringify(calls.map(call => call.body)).includes('local-dedupe'), false)
  runtime.abort()
})

test('Déduplication des étapes et pages répétées sans bloquer une nouvelle navigation', () => {
  const { runtime, calls } = fixture()
  runtime.choose('accepted')
  assert.equal(runtime.track('page_view', { once: 'page' }), true)
  assert.equal(runtime.track('page_view', { once: 'page' }), false)
  runtime.navigate('page-2')
  assert.equal(runtime.track('page_view', { once: 'page' }), true)
  runtime.navigate('page-1')
  assert.equal(runtime.track('page_view', { once: 'page' }), true)
  assert.equal(calls.length, 3)
  runtime.abort()
})

test('Volume plafonné par minute et aucune progression non bornée', () => {
  const { runtime, calls, advance } = fixture()
  runtime.choose('accepted')
  for (let index = 0; index < 60; index += 1) runtime.track('contact_click')
  assert.equal(calls.length, 45)
  advance(); assert.equal(runtime.track('contact_click'), true)
  assert.deepEqual(progressMarkers(50, 100, new Set([25])), [50])
  assert.deepEqual(progressMarkers(100, 100, new Set([25, 50, 75])), [100])
  assert.deepEqual(progressMarkers(1, Infinity, new Set()), [])
  assert.deepEqual(progressMarkers(1, 0, new Set()), [])
  assert.equal(isAnalyticsKey('personne-jean-dupont'), false)
  assert.equal(isAnalyticsKey('project-507f1f77bcf86cd799439011'), true)
  runtime.abort()
})

test('Une entrée par chargement après consentement, origine catégorisée sans URL ni identifiant',()=>{
  assert.equal(classifyAcquisition('https://www.google.fr/search?q=secret@example.test','https://mis-prod.fr'),'search')
  assert.equal(classifyAcquisition('https://mis-prod.fr/contact?email=secret@example.test','https://mis-prod.fr'),'internal')
  assert.equal(classifyAcquisition('https://linkedin.com/feed/personne','https://mis-prod.fr'),'social')
  assert.equal(classifyAcquisition('','https://mis-prod.fr'),'direct')
  assert.equal(classifyAcquisition('mailto:secret@example.test','https://mis-prod.fr'),'unknown')
  const {runtime,calls}=fixture();runtime.choose('accepted');runtime.track('page_view');runtime.navigate('page-2');runtime.track('page_view');runtime.choose('refused');runtime.choose('accepted');runtime.track('page_view')
  assert.deepEqual(calls.map(call=>call.body.entry),[true,false,false]);assert.deepEqual(calls.map(call=>call.body.acquisition),['unknown','internal','internal']);runtime.abort()
})
