import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`legal_eyebrow\` text;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`last_update_label\` text;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`form_unavailable\` text;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`download_label\` text;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`privacy_label\` text;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` ADD \`production_label\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`legal_eyebrow\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`last_update_label\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`form_unavailable\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`download_label\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`privacy_label\` text;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` ADD \`production_label\` text;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`legal_eyebrow\`;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`last_update_label\`;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`form_unavailable\`;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`download_label\`;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`privacy_label\`;`)
  await db.run(sql`ALTER TABLE \`site_content_ui\` DROP COLUMN \`production_label\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`legal_eyebrow\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`last_update_label\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`form_unavailable\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`download_label\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`privacy_label\`;`)
  await db.run(sql`ALTER TABLE \`_site_content_v_version_ui\` DROP COLUMN \`production_label\`;`)
}
