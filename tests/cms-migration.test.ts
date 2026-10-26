import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import {migrations} from '../src/migrations'

const directory = path.resolve('.data/tests/migration-' + randomUUID())
mkdirSync(directory, { recursive: true })
process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
process.env.DATABASE_URL = 'file:' + path.join(directory, 'cms.db').replaceAll('\\', '/')
Object.assign(process.env, { NODE_ENV: 'production', CMS_SCHEMA_PUSH: 'false' })

function migrate() {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/cms-migrate.mjs'], { cwd: process.cwd(), env: process.env, windowsHide: true })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    child.once('error', reject)
    child.once('close', code => resolve({ code, output }))
  })
}

test('Migration initiale réelle sans schema push, import rejouable et relecture durable', async () => {
  const initial = await migrate()
  assert.equal(initial.code, 0, initial.output)
  const { getCMS } = await import('../src/cms/payload')
  const { seedCMS } = await import('../scripts/cms-seed')
  const { fromPayloadContent } = await import('../src/cms/content-fields')
  const cms = await getCMS()
  try {
    assert.deepEqual(await seedCMS(cms), { created: 8, existing: 0 })
    assert.deepEqual(await seedCMS(cms), { created: 0, existing: 8 })
    assert.equal((await cms.count({ collection: 'users' })).totalDocs, 0)
    assert.equal(fromPayloadContent(await cms.findGlobal({ slug: 'site-content' })).site.url, 'https://mis-prod.fr')
    const home=(await cms.find({collection:'pages',where:{path:{equals:'/'}},depth:0,limit:1})).docs[0]
    const styled=[{blockType:'columns',title:'Recette styles',appearance:{customBackground:'#123456',customColor:'#ffffff',typeface:'serif',columns:3,tabletColumns:2,mobileColumns:1,animation:'fade',animationDuration:450},items:[{title:'Colonne'}]}]
    await cms.update({collection:'pages',id:home.id,draft:true,data:{layout:styled}})
    const saved=await cms.findByID({collection:'pages',id:home.id,draft:true,depth:0})
    assert.equal(saved.layout[0].appearance.tabletColumns,2)
    assert.equal(saved.layout[0].appearance.customBackground,'#123456')
    assert.notEqual((await cms.findByID({collection:'pages',id:home.id,draft:false,depth:0})).layout[0].blockType,'columns')
    await assert.rejects(cms.update({collection:'pages',id:home.id,draft:false,data:{_status:'published',layout:[{...styled[0],appearance:{customBackground:'url(https://invalid.test)'}}]}}))
  } finally { await cms.destroy() }
  const again = await migrate()
  assert.equal(again.code, 0, again.output)
  const db = new DatabaseSync(path.join(directory, 'cms.db'), { readOnly: true })
  try {
    assert.equal(db.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok')
    assert.equal(db.prepare('SELECT count(*) AS n FROM pages').get()?.n, 8)
    assert.deepEqual(db.prepare('SELECT name FROM payload_migrations WHERE batch > 0 ORDER BY name').all().map(row=>row.name),migrations.map(migration=>migration.name).sort())
    assert.equal(db.prepare("SELECT count(*) AS n FROM pragma_table_info('site_content_ui') WHERE name = 'privacy_label'").get()?.n, 1)
    assert.equal(db.prepare('SELECT count(*) AS n FROM payload_migrations WHERE batch = -1').get()?.n, 0)
    const snapshot = JSON.parse(readFileSync(path.resolve('src/migrations', migrations.at(-1)!.name + '.json'), 'utf8')) as { tables: Record<string, { columns: Record<string, { type: string; notNull: boolean }>; indexes: Record<string, unknown> }> }
    for (const [name, table] of Object.entries(snapshot.tables)) {
      const identifier = name.replaceAll('"', '""')
      const columns = db.prepare(`PRAGMA table_info("${identifier}")`).all()
      assert.deepEqual(columns.map(column => column.name).sort(), Object.keys(table.columns).sort(), `Colonnes de ${name}`)
      for (const column of columns) {
        const expected = table.columns[String(column.name)]
        assert.equal(String(column.type).toLowerCase(), expected.type.toLowerCase(), `Type de ${name}.${column.name}`)
        assert.equal(Boolean(column.notnull), Boolean(expected.notNull), `Nullabilité de ${name}.${column.name}`)
      }
      const indexes = db.prepare(`PRAGMA index_list("${identifier}")`).all().map(index => index.name)
      for (const index of Object.keys(table.indexes)) assert.ok(indexes.includes(index), `Index ${index}`)
    }
  } finally { db.close() }
})

test('La commande refuse une base de développement au lieu de la convertir implicitement', async () => {
  const protectedFile = path.join(directory, 'protected.db')
  const db = new DatabaseSync(protectedFile)
  db.exec('CREATE TABLE payload_migrations (id integer PRIMARY KEY, batch integer); INSERT INTO payload_migrations VALUES (1, -1); CREATE TABLE preserve_me (id integer PRIMARY KEY); INSERT INTO preserve_me VALUES (42)')
  db.close()
  const previous = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'file:' + protectedFile.replaceAll('\\', '/')
  try {
    const refused = await migrate()
    assert.notEqual(refused.code, 0)
    assert.match(refused.output, /schema push/)
    const preserved = new DatabaseSync(protectedFile, { readOnly: true })
    try { assert.equal(preserved.prepare('SELECT id FROM preserve_me').get()?.id, 42) } finally { preserved.close() }
  } finally { process.env.DATABASE_URL = previous }
})
