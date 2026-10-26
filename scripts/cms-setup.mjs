import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
mkdirSync('.data', { recursive: true })
if (!existsSync('.env.local')) {
  writeFileSync('.env.local', `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}\nDATABASE_URL=file:./.data/cms.db\nCMS_SCHEMA_PUSH=false\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\nCMS_EMAIL_DELIVERY=disabled\nCMS_AUTH_EMAIL_DELIVERY=disabled\nCMS_BROWSER_ANALYTICS=disabled\n`, { mode: 0o600, flag: 'wx' })
  console.log('Configuration locale créée, secret aléatoire non affiché. Aucun compte créé. Utilisez cms:owner avec des identifiants choisis dans un environnement protégé.')
} else console.log('.env.local existe : configuration conservée. Aucun fichier écrasé.')
