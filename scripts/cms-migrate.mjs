import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, open, readFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { spawn } from 'node:child_process'
import { requireLatestMigrationSnapshot } from './cms-migrate-state.mjs'

// Do not allow destructive Payload commands through the routine deployment entry point.
const [command = 'migrate', name, ...extra] = process.argv.slice(2)
if (!['migrate', 'migrate:status', 'migrate:create'].includes(command) || extra.length || (name && (command !== 'migrate:create' || !/^[a-z][a-z0-9_]{0,63}$/.test(name)))) {
  throw new Error('Usage : cms-migrate.mjs [migrate | migrate:status | migrate:create nom_en_minuscules]')
}
if (process.env.PAYLOAD_DROP_DATABASE === 'true') throw new Error('PAYLOAD_DROP_DATABASE est interdit par cette commande.')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (path.resolve(process.cwd()) !== root) throw new Error('Exécutez cette commande depuis la racine du projet.')
if (command === 'migrate:create') await requireLatestMigrationSnapshot(path.join(root, 'src/migrations'))
let lock, lockPath
try {
  if (command === 'migrate') {
    const url = process.env.DATABASE_URL
    if (!url?.startsWith('file:')) throw new Error('DATABASE_URL doit désigner une base SQLite locale file:.')
    const database = path.resolve(url.slice(5))
    await mkdir(path.dirname(database), { recursive: true })
    if (existsSync(database)) {
      const db = new DatabaseSync(database, { readOnly: true })
      try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
        const tracked = tables.some(table => table.name === 'payload_migrations')
        if (tables.length && !tracked) throw new Error('Base existante sans historique de migrations : migration initiale refusée. Sauvegardez puis préparez un import contrôlé dans une base neuve.')
        if (tracked && db.prepare('SELECT count(*) AS n FROM payload_migrations WHERE batch = -1').get().n) {
          throw new Error('Base créée par schema push : migration refusée pour éviter une destruction implicite. Utilisez une base neuve et un import contrôlé ; conservez cette base.')
        }
      } finally { db.close() }
    }
    lockPath = `${database}.migration.lock`
    try { lock = await open(lockPath, 'wx', 0o600) } catch (error) {
      if (error.code === 'EEXIST') throw new Error('Une migration est déjà verrouillée. Vérifiez le processus et le journal avant toute suppression manuelle du verrou.')
      throw error
    }
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }))
  }
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/payload/bin.js', command, ...(name ? [name] : [])], {
      cwd: root, stdio: 'inherit', windowsHide: true,
      env: { ...process.env, CMS_SCHEMA_PUSH: 'false', PAYLOAD_MIGRATING: 'true', NODE_ENV: command === 'migrate:create' ? 'development' : 'production' },
    })
    child.once('error', reject)
    child.once('close', code => resolve(code ?? 1))
  })
  process.exitCode = exitCode
} finally {
  if (lock) {
    await lock.close()
    // Remove only the lock owned by this invocation.
    const owner = JSON.parse(await readFile(lockPath, 'utf8'))
    if (owner.pid === process.pid) await unlink(lockPath)
  }
}
