import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-sqlite'
export async function up({db}:MigrateUpArgs){await db.run(sql`ALTER TABLE analytics_events ADD entry integer`);await db.run(sql`ALTER TABLE analytics_events ADD acquisition text`)}
export async function down({db}:MigrateDownArgs){await db.run(sql`ALTER TABLE analytics_events DROP COLUMN entry`);await db.run(sql`ALTER TABLE analytics_events DROP COLUMN acquisition`)}
