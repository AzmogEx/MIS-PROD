import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configuredMailTransport } from '../src/cms/operations'

test('Resend : transport commercial intercepté, activation, contrat, idempotence et erreurs', async t => {
  const keys = ['CMS_EMAIL_DELIVERY', 'RESEND_API_KEY', 'CONTACT_SENDER'] as const
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const calls: { url: string; options?: RequestInit }[] = []
  let response = () => Response.json({ id: 'isolated-provider-id' })
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => { calls.push({ url: String(url), options }); return response() })
  const message = { id: 1, dedupeKey: 'brief:1:internal', subject: 'Recette isolée', body: 'Contenu synthétique sans destinataire réel.', recipients: ['fixture@example.invalid'], attempts: 0, state: 'pending' }
  try {
    await t.test('sans activation, capture et aucun transport ; configuration incomplète refusée', async () => {
      delete process.env.CMS_EMAIL_DELIVERY; delete process.env.RESEND_API_KEY; delete process.env.CONTACT_SENDER
      assert.deepEqual(await configuredMailTransport().send(message), { providerId: 'local-test-capture', captured: true })
      assert.equal(calls.length, 0)
      process.env.CMS_EMAIL_DELIVERY = 'enabled'
      await assert.rejects(configuredMailTransport().send(message), /Configuration manquante/)
      process.env.RESEND_API_KEY = 'isolated-test-key'; process.env.CONTACT_SENDER = 'Recette <fixture@example.invalid>'
      await assert.rejects(configuredMailTransport().send({ ...message, recipients: [] }), /Aucun destinataire/)
      assert.equal(calls.length, 0)
    })
    await t.test('URL fixe, corps et clé identiques lors de deux tentatives', async () => {
      const transport = configuredMailTransport()
      assert.deepEqual(await transport.send(message), { providerId: 'isolated-provider-id' })
      await transport.send(message)
      assert.equal(calls.length, 2)
      for (const call of calls) {
        assert.equal(call.url, 'https://api.resend.com/emails'); assert.equal(call.options?.method, 'POST')
        const headers = new Headers(call.options?.headers)
        assert.equal(headers.get('Authorization'), 'Bearer isolated-test-key'); assert.equal(headers.get('Idempotency-Key'), message.dedupeKey)
        assert.deepEqual(JSON.parse(String(call.options?.body)), { from: process.env.CONTACT_SENDER, to: message.recipients, subject: message.subject, text: message.body })
        assert.ok(call.options?.signal instanceof AbortSignal)
      }
      assert.equal(calls[0].options?.body, calls[1].options?.body)
    })
    await t.test('échec fournisseur, réponse invalide et délai ne deviennent pas une réussite', async () => {
      response = () => new Response('diagnostic-secret-fournisseur', { status: 503 })
      await assert.rejects(configuredMailTransport().send(message), error => error instanceof Error && /HTTP 503/.test(error.message) && !error.message.includes('diagnostic-secret'))
      response = () => Response.json({})
      await assert.rejects(configuredMailTransport().send(message), /Réponse du fournisseur email invalide/)
      response = () => { throw new DOMException('Délai de recette', 'TimeoutError') }
      await assert.rejects(configuredMailTransport().send(message), error => error instanceof DOMException && error.name === 'TimeoutError')
    })
  } finally {
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] }
  }
})
