/** Creates a new isolated local acceptance environment. Never reuses a database
 * and never prints passwords, session cookies, tokens or secret values. */
import path from 'node:path'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'

await mkdir('.data/tests', { recursive: true })
const directory = await mkdtemp(path.resolve('.data/tests/video-browser-'))
const env = {
  PAYLOAD_SECRET: randomBytes(48).toString('hex'), DATABASE_URL: `file:${path.join(directory, 'cms.db').replaceAll('\\', '/')}`,
  CMS_MEDIA_DIR: path.join(directory, 'media').replaceAll('\\', '/'), CMS_PRIVATE_FILES_DIR: path.join(directory, 'private').replaceAll('\\', '/'),
  MEDIA_IMPORT_ROOT: path.join(directory, 'imports').replaceAll('\\', '/'), CMS_BRIEF_FILES_DIR: path.join(directory, 'briefs').replaceAll('\\', '/'),
  CMS_SCHEMA_PUSH: 'false', CMS_EMAIL_DELIVERY: 'disabled', CMS_AUTH_EMAIL_DELIVERY: 'disabled', CMS_SEARCH_CONSOLE: 'disabled', CMS_RETENTION_ENABLED: 'disabled', CMS_BROWSER_ANALYTICS: 'enabled', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3300',
}
Object.assign(process.env, env)
const environmentFile = path.join(directory, 'fixture.env'), credentialsFile = path.join(directory, 'credentials.json')
await writeFile(environmentFile, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' })
execFileSync(process.execPath, ['scripts/cms-migrate.mjs'], { env: process.env, stdio: 'inherit', windowsHide: true })
const [{ getCMS }, { seedCMS }, { default: sharp }] = await Promise.all([import('../src/cms/payload'), import('./cms-seed'), import('sharp')])
const cms = await getCMS()
try {
  await seedCMS(cms)
  const ownerAccount = { email: 'video-owner@example.test', password: randomBytes(32).toString('base64url') }, clientAccount = { email: 'video-client@example.test', password: randomBytes(32).toString('base64url') }
  const owner = { ...await cms.create({ collection: 'users', context: { bootstrap: true }, data: { ...ownerAccount, name: 'Recette vidéo isolée', role: 'owner' } }), collection: 'users' as const }
  const client = await cms.create({ collection: 'users', user: owner, data: { ...clientAccount, name: 'Client de recette', role: 'client' } })
  const png = await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#c9a961' } }).png().toBuffer()
  const poster = await cms.create({ collection: 'media', user: owner, file: { data: png, size: png.length, name: 'recette-affiche.png', mimetype: 'image/png' }, data: { alt: 'Affiche locale de recette', visibility: 'public' } })
  const subtitles = Buffer.from('WEBVTT\n\n00:00.000 --> 00:05.000\nLocal playback acceptance test.\n\n00:05.000 --> 00:15.440\nSeeking and subtitles stay available.\n')
  const captions = await cms.create({ collection: 'media', user: owner, file: { data: subtitles, size: subtitles.length, name: 'recette-en.vtt', mimetype: 'text/vtt' }, data: { alt: 'Sous-titres de recette anglais', visibility: 'public', language: 'en' } })
  const bytes = await readFile('public/hero.mp4')
  const video = await cms.create({ collection: 'media', user: owner, file: { data: bytes, size: bytes.length, name: 'recette-film.mp4', mimetype: 'video/mp4' }, data: { alt: 'Vidéo locale de recette', visibility: 'public', language: 'en', poster: poster.id, captions: captions.id, transcript: 'Local playback acceptance test. Seeking and subtitles stay available.' } })
  const page = await cms.create({ collection: 'pages', user: owner, data: { title: 'Recette vidéo locale', path: '/recette-video', _status: 'published', seo: { noindex: true }, layout: [{ blockType: 'editorial', title: 'Recette vidéo locale', body: 'Vidéo publique locale — affiche dorée, sous-titres anglais et transcription. La lecture est volontaire ; les mesures exigent votre consentement.', media: video.id }] } })
  const project = await cms.create({ collection: 'projects', user: owner, data: { title: 'Projet vidéo de recette', members: [client.id], status: 'review' } })
  const privateFile = await cms.create({ collection: 'private-files', user: owner, file: { data: bytes, size: bytes.length, name: 'recette-livrable-v1.mp4', mimetype: 'video/mp4' }, data: { title: 'Version vidéo privée', project: project.id } })
  const delivery = await cms.create({ collection: 'deliverables', user: owner, data: { title: 'Film de recette', version: 'V1', project: project.id, file: privateFile.id, duration: 15.44, clientVisible: true } })
  await writeFile(credentialsFile, JSON.stringify({ owner: ownerAccount, client: clientAccount }), { mode: 0o600, flag: 'wx' })
  const manifest = { environmentFile, credentialsFile, page: '/recette-video', pageID: page.id, mediaID: video.id, posterID: poster.id, captionsID: captions.id, projectID: project.id, privateFileID: privateFile.id, deliveryID: delivery.id }
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 })
  await writeFile('.data/video-qa-latest.json', JSON.stringify(manifest, null, 2), { mode: 0o600 })
  console.log('Recette isolée créée. Chemins et identifiants non secrets : .data/video-qa-latest.json. Les comptes aléatoires restent dans son fichier privé credentials.json.')
} finally { await cms.destroy() }
