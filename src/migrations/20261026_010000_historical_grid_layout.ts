import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

async function tables(db: MigrateUpArgs['db']) {
  const candidates = await db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'pages_blocks_%' OR name LIKE '_pages_v_blocks_%' OR name LIKE 'shared_sections_blocks_%' OR name LIKE '_shared_sections_v_blocks_%' OR name LIKE 'section_templates_blocks_%')`)
  const found: string[] = []
  for (const { name } of candidates) { const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(${sql.identifier(name)})`); if (columns.some(column => column.name === 'appearance_radius')) found.push(name) }
  if (!found.length) throw new Error('Aucune table de composition à migrer.')
  return found
}
export async function up({ db }: MigrateUpArgs) { for (const table of await tables(db)) await db.run(sql`ALTER TABLE ${sql.identifier(table)} ADD COLUMN appearance_grid_layout text DEFAULT 'original'`) }
export async function down({ db }: MigrateDownArgs) { for (const table of await tables(db)) await db.run(sql`ALTER TABLE ${sql.identifier(table)} DROP COLUMN appearance_grid_layout`) }
