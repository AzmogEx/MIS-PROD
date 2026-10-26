import { type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'
export async function up({ db }: MigrateUpArgs) {
  await db.run(sql`ALTER TABLE tasks ADD reminder_identity text`)
}
export async function down() {
  throw new Error('Restaurer la sauvegarde et la version applicative ensemble : supprimer les identités de rappels pourrait provoquer des doublons.')
}
