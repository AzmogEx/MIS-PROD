import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE forms ADD COLUMN translations text`)
  await db.run(sql`ALTER TABLE _forms_v ADD COLUMN version_translations text`)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE _forms_v DROP COLUMN version_translations`)
  await db.run(sql`ALTER TABLE forms DROP COLUMN translations`)
}
