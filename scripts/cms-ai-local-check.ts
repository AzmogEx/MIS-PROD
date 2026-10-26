/** Explicit, optional real-model acceptance check. Never run by CI or seed. */
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildConfig, getPayload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { aiCollections, aiSettings, generateAISuggestion, localOllamaURL } from '../src/cms/ai'

const endpoint = localOllamaURL()
const model = process.env.CMS_CHECK_OLLAMA_MODEL
if (!endpoint || !model || /cloud|https?:/i.test(model)) throw new Error('Définir OLLAMA_BASE_URL en boucle locale et CMS_CHECK_OLLAMA_MODEL installé, sans cloud.')
const dir = path.resolve('.data/tests/ai-real-' + randomUUID())
await mkdir(dir, { recursive: true })
const cms = await getPayload({ config: buildConfig({ secret: randomBytes(48).toString('hex'), telemetry: false,
  admin: { disable: true }, typescript: { autoGenerate: false },
  db: sqliteAdapter({ client: { url: 'file:' + path.join(dir, 'cms.db').replaceAll('\\', '/') }, push: true }),
  collections: [{ slug: 'users', auth: true, fields: [{ name: 'role', type: 'text' }] }, ...aiCollections], globals: [aiSettings],
}) })
try {
  const owner = await cms.create({ collection: 'users', data: { email: 'local-model-check@example.test', password: randomBytes(32).toString('hex'), role: 'owner' } })
  await cms.updateGlobal({ slug: 'ai-settings', data: { enabled: true, model, dailyRequests: 2, monthlyRequests: 2, maxInputCharacters: 1000, maxOutputTokens: 128 } })
  const version = await (await fetch(new URL('/api/version', endpoint), { signal: AbortSignal.timeout(5000), redirect: 'error' })).json() as { version: string }
  const tags = await (await fetch(new URL('/api/tags', endpoint), { signal: AbortSignal.timeout(5000), redirect: 'error' })).json() as { models: { name: string; digest: string; size: number; remote_host?: string; remote_model?: string }[] }
  const installed = tags.models.find(item => item.name === model)
  if (!installed || installed.remote_host || installed.remote_model) throw new Error('Modèle local non confirmé ; aucun texte envoyé.')
  const input = 'Exercice fictif de recette, sans client réel : un atelier de fabrication est filmé dans un studio. Le livrable prévu est une vidéo de trente secondes. Le tournage comporte un plan large et deux plans de détail. Préparer une description française courte de ce projet de démonstration.'
  const start = Date.now()
  const key = randomUUID()
  const result = await generateAISuggestion(cms, { id: owner.id, role: 'owner' }, { task: 'description', text: input, requestKey: key })
  const repeated = await generateAISuggestion(cms, { id: owner.id, role: 'owner' }, { task: 'description', text: input, requestKey: key })
  const report = { observedAt: new Date().toISOString(), provider: 'Ollama local', endpoint: endpoint.origin, version: version.version,
    model, digest: installed.digest, modelBytes: installed.size, elapsedMs: Date.now() - start,
    status: result.status, input, output: result.output || null, error: result.error || null,
    inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    durableRequests: (await cms.count({ collection: 'ai-requests' })).totalDocs,
    quotaReservations: (await cms.count({ collection: 'ai-budget-ledger' })).totalDocs,
    repeatedRequestSameID: result.id === repeated.id, database: path.relative(process.cwd(), path.join(dir, 'cms.db')),
    limits: 'Texte synthétique seulement. Suggestion privée, sans publication ni réponse client. Cette recette ne certifie pas la qualité générale du modèle.',
  }
  await mkdir('docs/cms/preuves', { recursive: true })
  await writeFile('docs/cms/preuves/ia-locale.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  if (result.status !== 'completed' || result.id !== repeated.id || report.durableRequests !== 1 || report.quotaReservations !== 1) process.exitCode = 1
} finally { await cms.destroy() }
