import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { backupAndVerify } from '../src/cms/backup'

test('Sauvegarde et restauration isolées incluent les nouveaux stockages privés sans verrous', async () => {
  const original = process.cwd(), root = path.resolve('.data/tests/backup-' + randomUUID())
  const keys = ['DATABASE_URL', 'CMS_MEDIA_DIR', 'CMS_PRIVATE_FILES_DIR', 'CMS_BRIEF_FILES_DIR', 'MEDIA_IMPORT_ROOT', 'CMS_SEARCH_CONSOLE_DIR'] as const
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  await mkdir(path.join(root, '.data'), { recursive: true })
  const files = ['.data/brief-files/attachment.json', '.data/media-imports/import/manifest.json', '.data/media-imports/import/chunk.bin', '.data/retention-archives/archive.json', 'custom-search/state.json', '.cms/private/client.pdf', '.data/media/public.png']
  try {
    process.chdir(root)
    for (const key of keys) delete process.env[key]
    process.env.DATABASE_URL = 'file:./.data/cms.db'
    process.env.CMS_SEARCH_CONSOLE_DIR = 'custom-search'
    const db = new DatabaseSync('.data/cms.db')
    db.exec('CREATE TABLE pages (id integer PRIMARY KEY); INSERT INTO pages VALUES (42)')
    db.close()
    await writeFile('.env.local', 'PAYLOAD_SECRET=fixture-only-never-a-production-secret', {mode:0o600})
    for (const file of [...files, '.data/media-imports/import/.lock', '.data/brief-files/.quota.lock']) {
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, 'Fixture locale de sauvegarde : ' + file)
    }
    const result = await backupAndVerify()
    assert.equal(result.status, 'completed')
    assert.equal(result.pages, 1)
    assert.equal(result.files, files.length)
    const manifest = JSON.parse(await readFile(path.join('.data/backups', result.backupID, 'manifest.json'), 'utf8'))
    assert.ok(manifest.database.sha256)
    assert.equal(manifest.configuration[0].path, '.env.local')
    const restored = path.join('.data/restore-checks', result.backupID)
    for (const file of files) assert.equal(await readFile(path.join(restored, 'files', file), 'utf8'), await readFile(file, 'utf8'))
    assert.equal(await readFile(path.join(restored, 'configuration/.env.local'), 'utf8'), await readFile('.env.local', 'utf8'))
    await assert.rejects(readFile(path.join(restored, 'files/.data/media-imports/import/.lock')), { code: 'ENOENT' })
    await assert.rejects(readFile(path.join(restored, 'files/.data/brief-files/.quota.lock')), { code: 'ENOENT' })
    const check = new DatabaseSync(path.join(restored, 'cms.db'), { readOnly: true })
    try { assert.equal(check.prepare('SELECT id FROM pages').get()?.id, 42) } finally { check.close() }
    process.env.MEDIA_IMPORT_ROOT = path.resolve(root, '..', 'external-fixture')
    await assert.rejects(backupAndVerify(), /stockage externe/)
    process.env.MEDIA_IMPORT_ROOT = '.data'
    await assert.rejects(backupAndVerify(), /Stockage trop large/)
  } finally {
    process.chdir(original)
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] }
  }
})
