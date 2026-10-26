import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-sqlite'

const additions:Record<string,string>={appearance_custom_background:'text',appearance_custom_color:'text',appearance_typeface:'text',appearance_tablet_columns:'numeric',appearance_mobile_columns:'numeric',appearance_animation:'text',appearance_animation_duration:'numeric'}
async function tables(db:MigrateUpArgs['db']){
  const rows=await db.all<{name:string}>(sql`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'pages_blocks_%' OR name LIKE '_pages_v_blocks_%' OR name LIKE 'shared_sections_blocks_%' OR name LIKE '_shared_sections_v_blocks_%' OR name LIKE 'section_templates_blocks_%')`)
  const result:string[]=[]
  for(const {name} of rows){const columns=await db.all<{name:string}>(sql`PRAGMA table_info(${sql.identifier(name)})`);if(columns.some(column=>column.name==='appearance_radius'))result.push(name)}
  if(!result.length)throw new Error('Aucune table de composition à migrer.')
  return result
}
export async function up({db}:MigrateUpArgs){for(const table of await tables(db))for(const [column,type] of Object.entries(additions))await db.run(sql`ALTER TABLE ${sql.identifier(table)} ADD ${sql.identifier(column)} ${sql.raw(type)}`)}
export async function down({db}:MigrateDownArgs){for(const table of await tables(db))for(const column of Object.keys(additions))await db.run(sql`ALTER TABLE ${sql.identifier(table)} DROP COLUMN ${sql.identifier(column)}`)}
