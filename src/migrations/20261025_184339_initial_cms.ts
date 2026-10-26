import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`created_at\` text,
    \`expires_at\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`role\` text DEFAULT 'client' NOT NULL,
    \`locale\` text DEFAULT 'fr',
    \`mfa_enabled\` integer DEFAULT false,
    \`mfa_secret\` text,
    \`mfa_pending_secret\` text,
    \`mfa_pending_expires_at\` text,
    \`mfa_recovery_hashes\` text,
    \`mfa_last_counter\` numeric,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`email\` text NOT NULL,
    \`reset_password_token\` text,
    \`reset_password_expiration\` text,
    \`salt\` text,
    \`hash\` text,
    \`reset_password_requested_at\` text,
    \`login_attempts\` numeric DEFAULT 0,
    \`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_manifesto_order_idx\` ON \`pages_blocks_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_manifesto_parent_id_idx\` ON \`pages_blocks_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_manifesto_path_idx\` ON \`pages_blocks_manifesto\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_stats_order_idx\` ON \`pages_blocks_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_stats_parent_id_idx\` ON \`pages_blocks_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_stats_path_idx\` ON \`pages_blocks_stats\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_universes_order_idx\` ON \`pages_blocks_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_universes_parent_id_idx\` ON \`pages_blocks_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_universes_path_idx\` ON \`pages_blocks_universes\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_portfolio_order_idx\` ON \`pages_blocks_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_portfolio_parent_id_idx\` ON \`pages_blocks_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_portfolio_path_idx\` ON \`pages_blocks_portfolio\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_clients_order_idx\` ON \`pages_blocks_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_clients_parent_id_idx\` ON \`pages_blocks_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_clients_path_idx\` ON \`pages_blocks_clients\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_order_idx\` ON \`pages_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_parent_id_idx\` ON \`pages_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_path_idx\` ON \`pages_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_order_idx\` ON \`pages_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_parent_id_idx\` ON \`pages_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_path_idx\` ON \`pages_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_universe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`universe_slug\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_universe_order_idx\` ON \`pages_blocks_universe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_universe_parent_id_idx\` ON \`pages_blocks_universe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_universe_path_idx\` ON \`pages_blocks_universe\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_contact\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`form_slug\` text DEFAULT 'brief-projet',
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_order_idx\` ON \`pages_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_parent_id_idx\` ON \`pages_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_path_idx\` ON \`pages_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_legal_sections\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`kind\` text DEFAULT 'paragraph',
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_sections_order_idx\` ON \`pages_blocks_legal_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_sections_parent_id_idx\` ON \`pages_blocks_legal_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_legal_sections_locales\` (
    \`text\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_legal_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_legal_sections_locales_locale_parent_id_unique\` ON \`pages_blocks_legal_sections_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_sections_locales_parent_id_idx\` ON \`pages_blocks_legal_sections_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_legal\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`number\` text,
    \`last_update\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_order_idx\` ON \`pages_blocks_legal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_parent_id_idx\` ON \`pages_blocks_legal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_path_idx\` ON \`pages_blocks_legal\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_legal_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_legal_locales_locale_parent_id_unique\` ON \`pages_blocks_legal_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_legal_locales_parent_id_idx\` ON \`pages_blocks_legal_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_editorial\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_editorial_order_idx\` ON \`pages_blocks_editorial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_editorial_parent_id_idx\` ON \`pages_blocks_editorial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_editorial_path_idx\` ON \`pages_blocks_editorial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_editorial_media_idx\` ON \`pages_blocks_editorial\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_editorial_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_editorial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_editorial_locales_locale_parent_id_unique\` ON \`pages_blocks_editorial_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_editorial_locales_parent_id_idx\` ON \`pages_blocks_editorial_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_columns_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_items_order_idx\` ON \`pages_blocks_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_items_parent_id_idx\` ON \`pages_blocks_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_items_media_idx\` ON \`pages_blocks_columns_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_columns_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_columns_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_columns_items_locales_locale_parent_id_unique\` ON \`pages_blocks_columns_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_items_locales_parent_id_idx\` ON \`pages_blocks_columns_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_order_idx\` ON \`pages_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_parent_id_idx\` ON \`pages_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_columns_path_idx\` ON \`pages_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_gallery_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_items_order_idx\` ON \`pages_blocks_gallery_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_items_parent_id_idx\` ON \`pages_blocks_gallery_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_items_media_idx\` ON \`pages_blocks_gallery_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_gallery_items_locales\` (
    \`caption\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_gallery_items_locales_locale_parent_id_unique\` ON \`pages_blocks_gallery_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_items_locales_parent_id_idx\` ON \`pages_blocks_gallery_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_gallery\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_order_idx\` ON \`pages_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_parent_id_idx\` ON \`pages_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_path_idx\` ON \`pages_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_gallery_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_gallery_locales_locale_parent_id_unique\` ON \`pages_blocks_gallery_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_locales_parent_id_idx\` ON \`pages_blocks_gallery_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_faq_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_items_order_idx\` ON \`pages_blocks_faq_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_items_parent_id_idx\` ON \`pages_blocks_faq_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_faq_items_locales\` (
    \`question\` text,
    \`answer\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_faq_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_faq_items_locales_locale_parent_id_unique\` ON \`pages_blocks_faq_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_items_locales_parent_id_idx\` ON \`pages_blocks_faq_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_faq\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_order_idx\` ON \`pages_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_parent_id_idx\` ON \`pages_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_path_idx\` ON \`pages_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_faq_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_faq_locales_locale_parent_id_unique\` ON \`pages_blocks_faq_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_locales_parent_id_idx\` ON \`pages_blocks_faq_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_items_order_idx\` ON \`pages_blocks_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_items_parent_id_idx\` ON \`pages_blocks_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_items_media_idx\` ON \`pages_blocks_steps_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_steps_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_steps_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_steps_items_locales_locale_parent_id_unique\` ON \`pages_blocks_steps_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_items_locales_parent_id_idx\` ON \`pages_blocks_steps_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_order_idx\` ON \`pages_blocks_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_parent_id_idx\` ON \`pages_blocks_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_path_idx\` ON \`pages_blocks_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_steps_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_blocks_steps_locales_locale_parent_id_unique\` ON \`pages_blocks_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_steps_locales_parent_id_idx\` ON \`pages_blocks_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_shared\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` integer,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`section_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_shared_order_idx\` ON \`pages_blocks_shared\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_shared_parent_id_idx\` ON \`pages_blocks_shared\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_shared_path_idx\` ON \`pages_blocks_shared\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_shared_section_idx\` ON \`pages_blocks_shared\` (\`section_id\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`path\` text,
    \`parent_id\` integer,
    \`kind\` text DEFAULT 'page',
    \`seo_noindex\` integer,
    \`seo_image_id\` integer,
    \`source_revision\` text,
    \`source_key\` text,
    \`provenance\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`deleted_at\` text,
    \`_status\` text DEFAULT 'draft',
    FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_path_idx\` ON \`pages\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`pages_parent_idx\` ON \`pages\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_image_idx\` ON \`pages\` (\`seo_image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_source_key_idx\` ON \`pages\` (\`source_key\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_deleted_at_idx\` ON \`pages\` (\`deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`pages_locales\` (
    \`title\` text,
    \`seo_title\` text,
    \`seo_description\` text,
    \`translation_state\` text DEFAULT 'source',
    \`reviewed_source_revision\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_locales_locale_parent_id_unique\` ON \`pages_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_locales_parent_id_idx\` ON \`pages_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_manifesto_order_idx\` ON \`_pages_v_blocks_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_manifesto_parent_id_idx\` ON \`_pages_v_blocks_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_manifesto_path_idx\` ON \`_pages_v_blocks_manifesto\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stats_order_idx\` ON \`_pages_v_blocks_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stats_parent_id_idx\` ON \`_pages_v_blocks_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stats_path_idx\` ON \`_pages_v_blocks_stats\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universes_order_idx\` ON \`_pages_v_blocks_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universes_parent_id_idx\` ON \`_pages_v_blocks_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universes_path_idx\` ON \`_pages_v_blocks_universes\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_portfolio_order_idx\` ON \`_pages_v_blocks_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_portfolio_parent_id_idx\` ON \`_pages_v_blocks_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_portfolio_path_idx\` ON \`_pages_v_blocks_portfolio\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_clients_order_idx\` ON \`_pages_v_blocks_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_clients_parent_id_idx\` ON \`_pages_v_blocks_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_clients_path_idx\` ON \`_pages_v_blocks_clients\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_order_idx\` ON \`_pages_v_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_parent_id_idx\` ON \`_pages_v_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_path_idx\` ON \`_pages_v_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_order_idx\` ON \`_pages_v_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_parent_id_idx\` ON \`_pages_v_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_path_idx\` ON \`_pages_v_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_universe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`universe_slug\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universe_order_idx\` ON \`_pages_v_blocks_universe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universe_parent_id_idx\` ON \`_pages_v_blocks_universe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_universe_path_idx\` ON \`_pages_v_blocks_universe\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_contact\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`form_slug\` text DEFAULT 'brief-projet',
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_order_idx\` ON \`_pages_v_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_parent_id_idx\` ON \`_pages_v_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_path_idx\` ON \`_pages_v_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_legal_sections\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`kind\` text DEFAULT 'paragraph',
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_sections_order_idx\` ON \`_pages_v_blocks_legal_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_sections_parent_id_idx\` ON \`_pages_v_blocks_legal_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_legal_sections_locales\` (
    \`text\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_legal_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_legal_sections_locales_locale_parent_id_uniq\` ON \`_pages_v_blocks_legal_sections_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_sections_locales_parent_id_idx\` ON \`_pages_v_blocks_legal_sections_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_legal\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`number\` text,
    \`last_update\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_order_idx\` ON \`_pages_v_blocks_legal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_parent_id_idx\` ON \`_pages_v_blocks_legal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_path_idx\` ON \`_pages_v_blocks_legal\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_legal_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_legal_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_legal_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_legal_locales_parent_id_idx\` ON \`_pages_v_blocks_legal_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_editorial\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_editorial_order_idx\` ON \`_pages_v_blocks_editorial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_editorial_parent_id_idx\` ON \`_pages_v_blocks_editorial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_editorial_path_idx\` ON \`_pages_v_blocks_editorial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_editorial_media_idx\` ON \`_pages_v_blocks_editorial\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_editorial_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_editorial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_editorial_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_editorial_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_editorial_locales_parent_id_idx\` ON \`_pages_v_blocks_editorial_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_columns_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_items_order_idx\` ON \`_pages_v_blocks_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_items_parent_id_idx\` ON \`_pages_v_blocks_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_items_media_idx\` ON \`_pages_v_blocks_columns_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_columns_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_columns_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_columns_items_locales_locale_parent_id_uniqu\` ON \`_pages_v_blocks_columns_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_items_locales_parent_id_idx\` ON \`_pages_v_blocks_columns_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_order_idx\` ON \`_pages_v_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_parent_id_idx\` ON \`_pages_v_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_columns_path_idx\` ON \`_pages_v_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_gallery_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_items_order_idx\` ON \`_pages_v_blocks_gallery_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_items_parent_id_idx\` ON \`_pages_v_blocks_gallery_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_items_media_idx\` ON \`_pages_v_blocks_gallery_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_gallery_items_locales\` (
    \`caption\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_gallery_items_locales_locale_parent_id_uniqu\` ON \`_pages_v_blocks_gallery_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_items_locales_parent_id_idx\` ON \`_pages_v_blocks_gallery_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_gallery\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_order_idx\` ON \`_pages_v_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_parent_id_idx\` ON \`_pages_v_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_path_idx\` ON \`_pages_v_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_gallery_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_gallery_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_gallery_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_locales_parent_id_idx\` ON \`_pages_v_blocks_gallery_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_faq_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_items_order_idx\` ON \`_pages_v_blocks_faq_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_items_parent_id_idx\` ON \`_pages_v_blocks_faq_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_faq_items_locales\` (
    \`question\` text,
    \`answer\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_faq_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_faq_items_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_faq_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_items_locales_parent_id_idx\` ON \`_pages_v_blocks_faq_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_faq\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_order_idx\` ON \`_pages_v_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_parent_id_idx\` ON \`_pages_v_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_path_idx\` ON \`_pages_v_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_faq_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_faq_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_faq_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_locales_parent_id_idx\` ON \`_pages_v_blocks_faq_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_items_order_idx\` ON \`_pages_v_blocks_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_items_parent_id_idx\` ON \`_pages_v_blocks_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_items_media_idx\` ON \`_pages_v_blocks_steps_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_steps_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_steps_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_steps_items_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_steps_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_items_locales_parent_id_idx\` ON \`_pages_v_blocks_steps_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_order_idx\` ON \`_pages_v_blocks_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_parent_id_idx\` ON \`_pages_v_blocks_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_path_idx\` ON \`_pages_v_blocks_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_steps_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_blocks_steps_locales_locale_parent_id_unique\` ON \`_pages_v_blocks_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_steps_locales_parent_id_idx\` ON \`_pages_v_blocks_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_shared\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` integer,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`section_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_shared_order_idx\` ON \`_pages_v_blocks_shared\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_shared_parent_id_idx\` ON \`_pages_v_blocks_shared\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_shared_path_idx\` ON \`_pages_v_blocks_shared\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_shared_section_idx\` ON \`_pages_v_blocks_shared\` (\`section_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_path\` text,
    \`version_parent_id\` integer,
    \`version_kind\` text DEFAULT 'page',
    \`version_seo_noindex\` integer,
    \`version_seo_image_id\` integer,
    \`version_source_revision\` text,
    \`version_source_key\` text,
    \`version_provenance\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`version_deleted_at\` text,
    \`version__status\` text DEFAULT 'draft',
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`snapshot\` integer,
    \`published_locale\` text,
    \`latest\` integer,
    \`autosave\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`version_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`version_seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_path_idx\` ON \`_pages_v\` (\`version_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_parent_idx\` ON \`_pages_v\` (\`version_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_seo_version_seo_image_idx\` ON \`_pages_v\` (\`version_seo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_source_key_idx\` ON \`_pages_v\` (\`version_source_key\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_deleted_at_idx\` ON \`_pages_v\` (\`version_deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_snapshot_idx\` ON \`_pages_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_published_locale_idx\` ON \`_pages_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_locales\` (
    \`version_title\` text,
    \`version_seo_title\` text,
    \`version_seo_description\` text,
    \`version_translation_state\` text DEFAULT 'source',
    \`version_reviewed_source_revision\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_locales_locale_parent_id_unique\` ON \`_pages_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_locales_parent_id_idx\` ON \`_pages_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`collection\` text,
    \`credit\` text,
    \`authorization\` text,
    \`visibility\` text DEFAULT 'restricted' NOT NULL,
    \`rights_until\` text,
    \`poster_id\` integer,
    \`captions_id\` integer,
    \`language\` text DEFAULT 'fr',
    \`source_key\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`url\` text,
    \`thumbnail_u_r_l\` text,
    \`filename\` text,
    \`mime_type\` text,
    \`filesize\` numeric,
    \`width\` numeric,
    \`height\` numeric,
    \`focal_x\` numeric,
    \`focal_y\` numeric,
    \`sizes_card_url\` text,
    \`sizes_card_width\` numeric,
    \`sizes_card_height\` numeric,
    \`sizes_card_mime_type\` text,
    \`sizes_card_filesize\` numeric,
    \`sizes_card_filename\` text,
    \`sizes_mobile_url\` text,
    \`sizes_mobile_width\` numeric,
    \`sizes_mobile_height\` numeric,
    \`sizes_mobile_mime_type\` text,
    \`sizes_mobile_filesize\` numeric,
    \`sizes_mobile_filename\` text,
    \`sizes_large_url\` text,
    \`sizes_large_width\` numeric,
    \`sizes_large_height\` numeric,
    \`sizes_large_mime_type\` text,
    \`sizes_large_filesize\` numeric,
    \`sizes_large_filename\` text,
    FOREIGN KEY (\`poster_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`captions_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`media_collection_idx\` ON \`media\` (\`collection\`);`)
  await db.run(sql`CREATE INDEX \`media_poster_idx\` ON \`media\` (\`poster_id\`);`)
  await db.run(sql`CREATE INDEX \`media_captions_idx\` ON \`media\` (\`captions_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_source_key_idx\` ON \`media\` (\`source_key\`);`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_mobile_sizes_mobile_filename_idx\` ON \`media\` (\`sizes_mobile_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_large_sizes_large_filename_idx\` ON \`media\` (\`sizes_large_filename\`);`)
  await db.run(sql`CREATE TABLE \`media_locales\` (
    \`alt\` text NOT NULL,
    \`transcript\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`media_locales_locale_parent_id_unique\` ON \`media_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`media_locales_parent_id_idx\` ON \`media_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`media_texts\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer NOT NULL,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`text\` text,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`media_texts_order_parent\` ON \`media_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_hero_order_idx\` ON \`shared_sections_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_hero_parent_id_idx\` ON \`shared_sections_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_hero_path_idx\` ON \`shared_sections_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_manifesto_order_idx\` ON \`shared_sections_blocks_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_manifesto_parent_id_idx\` ON \`shared_sections_blocks_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_manifesto_path_idx\` ON \`shared_sections_blocks_manifesto\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_stats_order_idx\` ON \`shared_sections_blocks_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_stats_parent_id_idx\` ON \`shared_sections_blocks_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_stats_path_idx\` ON \`shared_sections_blocks_stats\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universes_order_idx\` ON \`shared_sections_blocks_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universes_parent_id_idx\` ON \`shared_sections_blocks_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universes_path_idx\` ON \`shared_sections_blocks_universes\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_portfolio_order_idx\` ON \`shared_sections_blocks_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_portfolio_parent_id_idx\` ON \`shared_sections_blocks_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_portfolio_path_idx\` ON \`shared_sections_blocks_portfolio\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_clients_order_idx\` ON \`shared_sections_blocks_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_clients_parent_id_idx\` ON \`shared_sections_blocks_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_clients_path_idx\` ON \`shared_sections_blocks_clients\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_cta_order_idx\` ON \`shared_sections_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_cta_parent_id_idx\` ON \`shared_sections_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_cta_path_idx\` ON \`shared_sections_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_pricing_order_idx\` ON \`shared_sections_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_pricing_parent_id_idx\` ON \`shared_sections_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_pricing_path_idx\` ON \`shared_sections_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_universe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`universe_slug\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universe_order_idx\` ON \`shared_sections_blocks_universe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universe_parent_id_idx\` ON \`shared_sections_blocks_universe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_universe_path_idx\` ON \`shared_sections_blocks_universe\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_contact\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`form_slug\` text DEFAULT 'brief-projet',
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_contact_order_idx\` ON \`shared_sections_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_contact_parent_id_idx\` ON \`shared_sections_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_contact_path_idx\` ON \`shared_sections_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_legal_sections\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`kind\` text DEFAULT 'paragraph',
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_sections_order_idx\` ON \`shared_sections_blocks_legal_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_sections_parent_id_idx\` ON \`shared_sections_blocks_legal_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_legal_sections_locales\` (
    \`text\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_legal_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_legal_sections_locales_locale_parent_\` ON \`shared_sections_blocks_legal_sections_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_sections_locales_parent_id_idx\` ON \`shared_sections_blocks_legal_sections_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_legal\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`number\` text,
    \`last_update\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_order_idx\` ON \`shared_sections_blocks_legal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_parent_id_idx\` ON \`shared_sections_blocks_legal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_path_idx\` ON \`shared_sections_blocks_legal\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_legal_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_legal_locales_locale_parent_id_unique\` ON \`shared_sections_blocks_legal_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_legal_locales_parent_id_idx\` ON \`shared_sections_blocks_legal_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_editorial\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_editorial_order_idx\` ON \`shared_sections_blocks_editorial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_editorial_parent_id_idx\` ON \`shared_sections_blocks_editorial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_editorial_path_idx\` ON \`shared_sections_blocks_editorial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_editorial_media_idx\` ON \`shared_sections_blocks_editorial\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_editorial_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_editorial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_editorial_locales_locale_parent_id_un\` ON \`shared_sections_blocks_editorial_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_editorial_locales_parent_id_idx\` ON \`shared_sections_blocks_editorial_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_columns_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_items_order_idx\` ON \`shared_sections_blocks_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_items_parent_id_idx\` ON \`shared_sections_blocks_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_items_media_idx\` ON \`shared_sections_blocks_columns_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_columns_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_columns_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_columns_items_locales_locale_parent_i\` ON \`shared_sections_blocks_columns_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_items_locales_parent_id_idx\` ON \`shared_sections_blocks_columns_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_order_idx\` ON \`shared_sections_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_parent_id_idx\` ON \`shared_sections_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_columns_path_idx\` ON \`shared_sections_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_gallery_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_items_order_idx\` ON \`shared_sections_blocks_gallery_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_items_parent_id_idx\` ON \`shared_sections_blocks_gallery_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_items_media_idx\` ON \`shared_sections_blocks_gallery_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_gallery_items_locales\` (
    \`caption\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_gallery_items_locales_locale_parent_i\` ON \`shared_sections_blocks_gallery_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_items_locales_parent_id_idx\` ON \`shared_sections_blocks_gallery_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_gallery\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_order_idx\` ON \`shared_sections_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_parent_id_idx\` ON \`shared_sections_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_path_idx\` ON \`shared_sections_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_gallery_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_gallery_locales_locale_parent_id_uniq\` ON \`shared_sections_blocks_gallery_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_gallery_locales_parent_id_idx\` ON \`shared_sections_blocks_gallery_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_faq_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_items_order_idx\` ON \`shared_sections_blocks_faq_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_items_parent_id_idx\` ON \`shared_sections_blocks_faq_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_faq_items_locales\` (
    \`question\` text,
    \`answer\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_faq_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_faq_items_locales_locale_parent_id_un\` ON \`shared_sections_blocks_faq_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_items_locales_parent_id_idx\` ON \`shared_sections_blocks_faq_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_faq\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_order_idx\` ON \`shared_sections_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_parent_id_idx\` ON \`shared_sections_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_path_idx\` ON \`shared_sections_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_faq_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_faq_locales_locale_parent_id_unique\` ON \`shared_sections_blocks_faq_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_faq_locales_parent_id_idx\` ON \`shared_sections_blocks_faq_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_items_order_idx\` ON \`shared_sections_blocks_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_items_parent_id_idx\` ON \`shared_sections_blocks_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_items_media_idx\` ON \`shared_sections_blocks_steps_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_steps_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_steps_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_steps_items_locales_locale_parent_id_\` ON \`shared_sections_blocks_steps_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_items_locales_parent_id_idx\` ON \`shared_sections_blocks_steps_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_order_idx\` ON \`shared_sections_blocks_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_parent_id_idx\` ON \`shared_sections_blocks_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_path_idx\` ON \`shared_sections_blocks_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections_blocks_steps_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`shared_sections_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`shared_sections_blocks_steps_locales_locale_parent_id_unique\` ON \`shared_sections_blocks_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_blocks_steps_locales_parent_id_idx\` ON \`shared_sections_blocks_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`shared_sections\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`deleted_at\` text,
    \`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE INDEX \`shared_sections_updated_at_idx\` ON \`shared_sections\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_created_at_idx\` ON \`shared_sections\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections_deleted_at_idx\` ON \`shared_sections\` (\`deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`shared_sections__status_idx\` ON \`shared_sections\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_hero_order_idx\` ON \`_shared_sections_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_hero_parent_id_idx\` ON \`_shared_sections_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_hero_path_idx\` ON \`_shared_sections_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_manifesto_order_idx\` ON \`_shared_sections_v_blocks_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_manifesto_parent_id_idx\` ON \`_shared_sections_v_blocks_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_manifesto_path_idx\` ON \`_shared_sections_v_blocks_manifesto\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_stats_order_idx\` ON \`_shared_sections_v_blocks_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_stats_parent_id_idx\` ON \`_shared_sections_v_blocks_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_stats_path_idx\` ON \`_shared_sections_v_blocks_stats\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universes_order_idx\` ON \`_shared_sections_v_blocks_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universes_parent_id_idx\` ON \`_shared_sections_v_blocks_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universes_path_idx\` ON \`_shared_sections_v_blocks_universes\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_portfolio_order_idx\` ON \`_shared_sections_v_blocks_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_portfolio_parent_id_idx\` ON \`_shared_sections_v_blocks_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_portfolio_path_idx\` ON \`_shared_sections_v_blocks_portfolio\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_clients_order_idx\` ON \`_shared_sections_v_blocks_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_clients_parent_id_idx\` ON \`_shared_sections_v_blocks_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_clients_path_idx\` ON \`_shared_sections_v_blocks_clients\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_cta_order_idx\` ON \`_shared_sections_v_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_cta_parent_id_idx\` ON \`_shared_sections_v_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_cta_path_idx\` ON \`_shared_sections_v_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_pricing_order_idx\` ON \`_shared_sections_v_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_pricing_parent_id_idx\` ON \`_shared_sections_v_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_pricing_path_idx\` ON \`_shared_sections_v_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_universe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`universe_slug\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universe_order_idx\` ON \`_shared_sections_v_blocks_universe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universe_parent_id_idx\` ON \`_shared_sections_v_blocks_universe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_universe_path_idx\` ON \`_shared_sections_v_blocks_universe\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_contact\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`form_slug\` text DEFAULT 'brief-projet',
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_contact_order_idx\` ON \`_shared_sections_v_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_contact_parent_id_idx\` ON \`_shared_sections_v_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_contact_path_idx\` ON \`_shared_sections_v_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_legal_sections\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`kind\` text DEFAULT 'paragraph',
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_sections_order_idx\` ON \`_shared_sections_v_blocks_legal_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_sections_parent_id_idx\` ON \`_shared_sections_v_blocks_legal_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_legal_sections_locales\` (
    \`text\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_legal_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_legal_sections_locales_locale_pare\` ON \`_shared_sections_v_blocks_legal_sections_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_sections_locales_parent__idx\` ON \`_shared_sections_v_blocks_legal_sections_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_legal\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`number\` text,
    \`last_update\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_order_idx\` ON \`_shared_sections_v_blocks_legal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_parent_id_idx\` ON \`_shared_sections_v_blocks_legal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_path_idx\` ON \`_shared_sections_v_blocks_legal\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_legal_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_legal_locales_locale_parent_id_uni\` ON \`_shared_sections_v_blocks_legal_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_legal_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_legal_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_editorial\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_editorial_order_idx\` ON \`_shared_sections_v_blocks_editorial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_editorial_parent_id_idx\` ON \`_shared_sections_v_blocks_editorial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_editorial_path_idx\` ON \`_shared_sections_v_blocks_editorial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_editorial_media_idx\` ON \`_shared_sections_v_blocks_editorial\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_editorial_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_editorial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_editorial_locales_locale_parent_id\` ON \`_shared_sections_v_blocks_editorial_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_editorial_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_editorial_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_columns_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_items_order_idx\` ON \`_shared_sections_v_blocks_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_items_parent_id_idx\` ON \`_shared_sections_v_blocks_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_items_media_idx\` ON \`_shared_sections_v_blocks_columns_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_columns_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_columns_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_columns_items_locales_locale_paren\` ON \`_shared_sections_v_blocks_columns_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_items_locales_parent_i_idx\` ON \`_shared_sections_v_blocks_columns_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_order_idx\` ON \`_shared_sections_v_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_parent_id_idx\` ON \`_shared_sections_v_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_columns_path_idx\` ON \`_shared_sections_v_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_gallery_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_items_order_idx\` ON \`_shared_sections_v_blocks_gallery_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_items_parent_id_idx\` ON \`_shared_sections_v_blocks_gallery_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_items_media_idx\` ON \`_shared_sections_v_blocks_gallery_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_gallery_items_locales\` (
    \`caption\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_gallery_items_locales_locale_paren\` ON \`_shared_sections_v_blocks_gallery_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_items_locales_parent_i_idx\` ON \`_shared_sections_v_blocks_gallery_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_gallery\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_order_idx\` ON \`_shared_sections_v_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_parent_id_idx\` ON \`_shared_sections_v_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_path_idx\` ON \`_shared_sections_v_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_gallery_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_gallery_locales_locale_parent_id_u\` ON \`_shared_sections_v_blocks_gallery_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_gallery_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_gallery_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_faq_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_items_order_idx\` ON \`_shared_sections_v_blocks_faq_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_items_parent_id_idx\` ON \`_shared_sections_v_blocks_faq_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_faq_items_locales\` (
    \`question\` text,
    \`answer\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_faq_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_faq_items_locales_locale_parent_id\` ON \`_shared_sections_v_blocks_faq_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_items_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_faq_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_faq\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_order_idx\` ON \`_shared_sections_v_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_parent_id_idx\` ON \`_shared_sections_v_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_path_idx\` ON \`_shared_sections_v_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_faq_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_faq_locales_locale_parent_id_uniqu\` ON \`_shared_sections_v_blocks_faq_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_faq_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_faq_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_items_order_idx\` ON \`_shared_sections_v_blocks_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_items_parent_id_idx\` ON \`_shared_sections_v_blocks_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_items_media_idx\` ON \`_shared_sections_v_blocks_steps_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_steps_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_steps_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_steps_items_locales_locale_parent_\` ON \`_shared_sections_v_blocks_steps_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_items_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_steps_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_order_idx\` ON \`_shared_sections_v_blocks_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_parent_id_idx\` ON \`_shared_sections_v_blocks_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_path_idx\` ON \`_shared_sections_v_blocks_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v_blocks_steps_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_shared_sections_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_shared_sections_v_blocks_steps_locales_locale_parent_id_uni\` ON \`_shared_sections_v_blocks_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_blocks_steps_locales_parent_id_idx\` ON \`_shared_sections_v_blocks_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_shared_sections_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_title\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`version_deleted_at\` text,
    \`version__status\` text DEFAULT 'draft',
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`snapshot\` integer,
    \`published_locale\` text,
    \`latest\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_parent_idx\` ON \`_shared_sections_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_version_version_updated_at_idx\` ON \`_shared_sections_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_version_version_created_at_idx\` ON \`_shared_sections_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_version_version_deleted_at_idx\` ON \`_shared_sections_v\` (\`version_deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_version_version__status_idx\` ON \`_shared_sections_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_created_at_idx\` ON \`_shared_sections_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_updated_at_idx\` ON \`_shared_sections_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_snapshot_idx\` ON \`_shared_sections_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_published_locale_idx\` ON \`_shared_sections_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_shared_sections_v_latest_idx\` ON \`_shared_sections_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_hero_order_idx\` ON \`section_templates_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_hero_parent_id_idx\` ON \`section_templates_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_hero_path_idx\` ON \`section_templates_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_manifesto_order_idx\` ON \`section_templates_blocks_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_manifesto_parent_id_idx\` ON \`section_templates_blocks_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_manifesto_path_idx\` ON \`section_templates_blocks_manifesto\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_stats_order_idx\` ON \`section_templates_blocks_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_stats_parent_id_idx\` ON \`section_templates_blocks_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_stats_path_idx\` ON \`section_templates_blocks_stats\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universes_order_idx\` ON \`section_templates_blocks_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universes_parent_id_idx\` ON \`section_templates_blocks_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universes_path_idx\` ON \`section_templates_blocks_universes\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_portfolio_order_idx\` ON \`section_templates_blocks_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_portfolio_parent_id_idx\` ON \`section_templates_blocks_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_portfolio_path_idx\` ON \`section_templates_blocks_portfolio\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_clients_order_idx\` ON \`section_templates_blocks_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_clients_parent_id_idx\` ON \`section_templates_blocks_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_clients_path_idx\` ON \`section_templates_blocks_clients\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_cta_order_idx\` ON \`section_templates_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_cta_parent_id_idx\` ON \`section_templates_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_cta_path_idx\` ON \`section_templates_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_pricing_order_idx\` ON \`section_templates_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_pricing_parent_id_idx\` ON \`section_templates_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_pricing_path_idx\` ON \`section_templates_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_universe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`universe_slug\` text NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universe_order_idx\` ON \`section_templates_blocks_universe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universe_parent_id_idx\` ON \`section_templates_blocks_universe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_universe_path_idx\` ON \`section_templates_blocks_universe\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_contact\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`form_slug\` text DEFAULT 'brief-projet',
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_contact_order_idx\` ON \`section_templates_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_contact_parent_id_idx\` ON \`section_templates_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_contact_path_idx\` ON \`section_templates_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_legal_sections\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`kind\` text DEFAULT 'paragraph',
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_sections_order_idx\` ON \`section_templates_blocks_legal_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_sections_parent_id_idx\` ON \`section_templates_blocks_legal_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_legal_sections_locales\` (
    \`text\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_legal_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_legal_sections_locales_locale_paren\` ON \`section_templates_blocks_legal_sections_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_sections_locales_parent_i_idx\` ON \`section_templates_blocks_legal_sections_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_legal\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`number\` text,
    \`last_update\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_order_idx\` ON \`section_templates_blocks_legal\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_parent_id_idx\` ON \`section_templates_blocks_legal\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_path_idx\` ON \`section_templates_blocks_legal\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_legal_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_legal\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_legal_locales_locale_parent_id_uniq\` ON \`section_templates_blocks_legal_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_legal_locales_parent_id_idx\` ON \`section_templates_blocks_legal_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_editorial\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_editorial_order_idx\` ON \`section_templates_blocks_editorial\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_editorial_parent_id_idx\` ON \`section_templates_blocks_editorial\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_editorial_path_idx\` ON \`section_templates_blocks_editorial\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_editorial_media_idx\` ON \`section_templates_blocks_editorial\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_editorial_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_editorial\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_editorial_locales_locale_parent_id_\` ON \`section_templates_blocks_editorial_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_editorial_locales_parent_id_idx\` ON \`section_templates_blocks_editorial_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_columns_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_items_order_idx\` ON \`section_templates_blocks_columns_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_items_parent_id_idx\` ON \`section_templates_blocks_columns_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_items_media_idx\` ON \`section_templates_blocks_columns_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_columns_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_columns_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_columns_items_locales_locale_parent\` ON \`section_templates_blocks_columns_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_items_locales_parent_id_idx\` ON \`section_templates_blocks_columns_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_order_idx\` ON \`section_templates_blocks_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_parent_id_idx\` ON \`section_templates_blocks_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_columns_path_idx\` ON \`section_templates_blocks_columns\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_gallery_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer NOT NULL,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_items_order_idx\` ON \`section_templates_blocks_gallery_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_items_parent_id_idx\` ON \`section_templates_blocks_gallery_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_items_media_idx\` ON \`section_templates_blocks_gallery_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_gallery_items_locales\` (
    \`caption\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_gallery_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_gallery_items_locales_locale_parent\` ON \`section_templates_blocks_gallery_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_items_locales_parent_id_idx\` ON \`section_templates_blocks_gallery_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_gallery\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_order_idx\` ON \`section_templates_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_parent_id_idx\` ON \`section_templates_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_path_idx\` ON \`section_templates_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_gallery_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_gallery_locales_locale_parent_id_un\` ON \`section_templates_blocks_gallery_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_gallery_locales_parent_id_idx\` ON \`section_templates_blocks_gallery_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_faq_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_items_order_idx\` ON \`section_templates_blocks_faq_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_items_parent_id_idx\` ON \`section_templates_blocks_faq_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_faq_items_locales\` (
    \`question\` text NOT NULL,
    \`answer\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_faq_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_faq_items_locales_locale_parent_id_\` ON \`section_templates_blocks_faq_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_items_locales_parent_id_idx\` ON \`section_templates_blocks_faq_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_faq\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_order_idx\` ON \`section_templates_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_parent_id_idx\` ON \`section_templates_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_path_idx\` ON \`section_templates_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_faq_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_faq\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_faq_locales_locale_parent_id_unique\` ON \`section_templates_blocks_faq_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_faq_locales_parent_id_idx\` ON \`section_templates_blocks_faq_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`media_id\` integer,
    \`link\` text,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_items_order_idx\` ON \`section_templates_blocks_steps_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_items_parent_id_idx\` ON \`section_templates_blocks_steps_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_items_media_idx\` ON \`section_templates_blocks_steps_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_steps_items_locales\` (
    \`eyebrow\` text,
    \`title\` text,
    \`body\` text,
    \`link_label\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_steps_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_steps_items_locales_locale_parent_i\` ON \`section_templates_blocks_steps_items_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_items_locales_parent_id_idx\` ON \`section_templates_blocks_steps_items_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_order_idx\` ON \`section_templates_blocks_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_parent_id_idx\` ON \`section_templates_blocks_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_path_idx\` ON \`section_templates_blocks_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_steps_locales\` (
    \`title\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`section_templates_blocks_steps_locales_locale_parent_id_uniq\` ON \`section_templates_blocks_steps_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_steps_locales_parent_id_idx\` ON \`section_templates_blocks_steps_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates_blocks_shared\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` integer NOT NULL,
    \`hidden\` integer DEFAULT false,
    \`anchor\` text,
    \`appearance_background\` text DEFAULT 'inherit',
    \`appearance_color\` text DEFAULT 'inherit',
    \`appearance_align\` text DEFAULT 'left',
    \`appearance_width\` text DEFAULT 'wide',
    \`appearance_spacing\` text DEFAULT 'inherit',
    \`appearance_columns\` numeric DEFAULT 1,
    \`appearance_radius\` numeric DEFAULT 0,
    \`appearance_border\` integer,
    \`block_name\` text,
    FOREIGN KEY (\`section_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_shared_order_idx\` ON \`section_templates_blocks_shared\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_shared_parent_id_idx\` ON \`section_templates_blocks_shared\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_shared_path_idx\` ON \`section_templates_blocks_shared\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_blocks_shared_section_idx\` ON \`section_templates_blocks_shared\` (\`section_id\`);`)
  await db.run(sql`CREATE TABLE \`section_templates\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`section_templates_updated_at_idx\` ON \`section_templates\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`section_templates_created_at_idx\` ON \`section_templates\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`redirects\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`from\` text NOT NULL,
    \`to\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`redirects_from_idx\` ON \`redirects\` (\`from\`);`)
  await db.run(sql`CREATE INDEX \`redirects_updated_at_idx\` ON \`redirects\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`redirects_created_at_idx\` ON \`redirects\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`audit_log\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`action\` text NOT NULL,
    \`collection_name\` text,
    \`document_i_d\` text,
    \`actor_id\` integer,
    \`occurred_at\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`audit_log_actor_idx\` ON \`audit_log\` (\`actor_id\`);`)
  await db.run(sql`CREATE INDEX \`audit_log_updated_at_idx\` ON \`audit_log\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`audit_log_created_at_idx\` ON \`audit_log\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`publication_releases\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`page_id\` integer NOT NULL,
    \`page_snapshot\` text,
    \`content_snapshot\` text,
    \`actor_id\` integer,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`publication_releases_page_idx\` ON \`publication_releases\` (\`page_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_releases_actor_idx\` ON \`publication_releases\` (\`actor_id\`);`)
  await db.run(sql`CREATE INDEX \`publication_releases_updated_at_idx\` ON \`publication_releases\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`publication_releases_created_at_idx\` ON \`publication_releases\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`forms_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`title\` text,
    \`description\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`forms_steps_order_idx\` ON \`forms_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`forms_steps_parent_id_idx\` ON \`forms_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`forms_fields_options\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    \`label\` text,
    \`description\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`forms_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`forms_fields_options_order_idx\` ON \`forms_fields_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`forms_fields_options_parent_id_idx\` ON \`forms_fields_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`forms_fields_condition_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`forms_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`forms_fields_condition_values_order_idx\` ON \`forms_fields_condition_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`forms_fields_condition_values_parent_id_idx\` ON \`forms_fields_condition_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`forms_fields\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`step\` text,
    \`type\` text DEFAULT 'text',
    \`required\` integer,
    \`placeholder\` text,
    \`help\` text,
    \`min_length\` numeric,
    \`max_length\` numeric DEFAULT 5000,
    \`condition_field\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`forms_fields_order_idx\` ON \`forms_fields\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`forms_fields_parent_id_idx\` ON \`forms_fields\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`forms_notification_recipients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`email\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`forms_notification_recipients_order_idx\` ON \`forms_notification_recipients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`forms_notification_recipients_parent_id_idx\` ON \`forms_notification_recipients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`forms\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`slug\` text,
    \`texts_next\` text,
    \`texts_back\` text,
    \`texts_submit\` text,
    \`texts_pending\` text,
    \`texts_success_title\` text,
    \`texts_success_description\` text,
    \`texts_signature\` text,
    \`texts_error_title\` text,
    \`texts_network_error\` text,
    \`texts_invalid_error\` text,
    \`texts_rate_limit_error\` text,
    \`texts_unavailable_error\` text,
    \`texts_required_error\` text,
    \`texts_privacy\` text,
    \`texts_honeypot\` text,
    \`notification_enabled\` integer DEFAULT true,
    \`notification_subject\` text,
    \`notification_acknowledgement_enabled\` integer DEFAULT false,
    \`notification_acknowledgement_subject\` text,
    \`notification_acknowledgement_body\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`deleted_at\` text,
    \`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`forms_slug_idx\` ON \`forms\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`forms_updated_at_idx\` ON \`forms\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`forms_created_at_idx\` ON \`forms\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`forms_deleted_at_idx\` ON \`forms\` (\`deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`forms__status_idx\` ON \`forms\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v_version_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`title\` text,
    \`description\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_forms_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_version_steps_order_idx\` ON \`_forms_v_version_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_steps_parent_id_idx\` ON \`_forms_v_version_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v_version_fields_options\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`label\` text,
    \`description\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_forms_v_version_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_options_order_idx\` ON \`_forms_v_version_fields_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_options_parent_id_idx\` ON \`_forms_v_version_fields_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v_version_fields_condition_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_forms_v_version_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_condition_values_order_idx\` ON \`_forms_v_version_fields_condition_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_condition_values_parent_id_idx\` ON \`_forms_v_version_fields_condition_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v_version_fields\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`step\` text,
    \`type\` text DEFAULT 'text',
    \`required\` integer,
    \`placeholder\` text,
    \`help\` text,
    \`min_length\` numeric,
    \`max_length\` numeric DEFAULT 5000,
    \`condition_field\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_forms_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_order_idx\` ON \`_forms_v_version_fields\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_fields_parent_id_idx\` ON \`_forms_v_version_fields\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v_version_notification_recipients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`email\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_forms_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_version_notification_recipients_order_idx\` ON \`_forms_v_version_notification_recipients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_notification_recipients_parent_id_idx\` ON \`_forms_v_version_notification_recipients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_forms_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_title\` text,
    \`version_slug\` text,
    \`version_texts_next\` text,
    \`version_texts_back\` text,
    \`version_texts_submit\` text,
    \`version_texts_pending\` text,
    \`version_texts_success_title\` text,
    \`version_texts_success_description\` text,
    \`version_texts_signature\` text,
    \`version_texts_error_title\` text,
    \`version_texts_network_error\` text,
    \`version_texts_invalid_error\` text,
    \`version_texts_rate_limit_error\` text,
    \`version_texts_unavailable_error\` text,
    \`version_texts_required_error\` text,
    \`version_texts_privacy\` text,
    \`version_texts_honeypot\` text,
    \`version_notification_enabled\` integer DEFAULT true,
    \`version_notification_subject\` text,
    \`version_notification_acknowledgement_enabled\` integer DEFAULT false,
    \`version_notification_acknowledgement_subject\` text,
    \`version_notification_acknowledgement_body\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`version_deleted_at\` text,
    \`version__status\` text DEFAULT 'draft',
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`snapshot\` integer,
    \`published_locale\` text,
    \`latest\` integer,
    \`autosave\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_forms_v_parent_idx\` ON \`_forms_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_version_slug_idx\` ON \`_forms_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_version_updated_at_idx\` ON \`_forms_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_version_created_at_idx\` ON \`_forms_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_version_deleted_at_idx\` ON \`_forms_v\` (\`version_deleted_at\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_version_version__status_idx\` ON \`_forms_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_created_at_idx\` ON \`_forms_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_updated_at_idx\` ON \`_forms_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_snapshot_idx\` ON \`_forms_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_published_locale_idx\` ON \`_forms_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_latest_idx\` ON \`_forms_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_forms_v_autosave_idx\` ON \`_forms_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`crm_statuses\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`key\` text NOT NULL,
    \`order\` numeric DEFAULT 0,
    \`category\` text DEFAULT 'open' NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`crm_statuses_key_idx\` ON \`crm_statuses\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`crm_statuses_updated_at_idx\` ON \`crm_statuses\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`crm_statuses_created_at_idx\` ON \`crm_statuses\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`crm_statuses_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`crm_statuses_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`crm_statuses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`crm_statuses_id\`) REFERENCES \`crm_statuses\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`crm_statuses_rels_order_idx\` ON \`crm_statuses_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`crm_statuses_rels_parent_idx\` ON \`crm_statuses_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`crm_statuses_rels_path_idx\` ON \`crm_statuses_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`crm_statuses_rels_crm_statuses_id_idx\` ON \`crm_statuses_rels\` (\`crm_statuses_id\`);`)
  await db.run(sql`CREATE TABLE \`briefs_notes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`text\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`briefs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`briefs_notes_order_idx\` ON \`briefs_notes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`briefs_notes_parent_id_idx\` ON \`briefs_notes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`briefs\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`submission_key\` text NOT NULL,
    \`submission_hash\` text NOT NULL,
    \`name\` text,
    \`email\` text,
    \`universe\` text,
    \`form_id\` integer,
    \`form_revision\` text,
    \`status_id\` integer NOT NULL,
    \`assignee_id\` integer,
    \`next_action\` text,
    \`due_at\` text,
    \`budget_cents\` numeric,
    \`answers\` text NOT NULL,
    \`schema_snapshot\` text NOT NULL,
    \`history\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`deleted_at\` text,
    FOREIGN KEY (\`form_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`status_id\`) REFERENCES \`crm_statuses\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`briefs_submission_key_idx\` ON \`briefs\` (\`submission_key\`);`)
  await db.run(sql`CREATE INDEX \`briefs_form_idx\` ON \`briefs\` (\`form_id\`);`)
  await db.run(sql`CREATE INDEX \`briefs_status_idx\` ON \`briefs\` (\`status_id\`);`)
  await db.run(sql`CREATE INDEX \`briefs_assignee_idx\` ON \`briefs\` (\`assignee_id\`);`)
  await db.run(sql`CREATE INDEX \`briefs_due_at_idx\` ON \`briefs\` (\`due_at\`);`)
  await db.run(sql`CREATE INDEX \`briefs_updated_at_idx\` ON \`briefs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`briefs_created_at_idx\` ON \`briefs\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`briefs_deleted_at_idx\` ON \`briefs\` (\`deleted_at\`);`)
  await db.run(sql`CREATE TABLE \`notifications\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`dedupe_key\` text NOT NULL,
    \`brief_id\` integer NOT NULL,
    \`kind\` text NOT NULL,
    \`subject\` text NOT NULL,
    \`recipients\` text NOT NULL,
    \`body\` text NOT NULL,
    \`state\` text DEFAULT 'pending' NOT NULL,
    \`attempts\` numeric DEFAULT 0,
    \`next_attempt_at\` text,
    \`lease_until\` text,
    \`claim_token\` text,
    \`first_attempt_at\` text,
    \`delivered_at\` text,
    \`provider_id\` text,
    \`error\` text,
    \`retry_now\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`brief_id\`) REFERENCES \`briefs\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`notifications_dedupe_key_idx\` ON \`notifications\` (\`dedupe_key\`);`)
  await db.run(sql`CREATE INDEX \`notifications_brief_idx\` ON \`notifications\` (\`brief_id\`);`)
  await db.run(sql`CREATE INDEX \`notifications_state_idx\` ON \`notifications\` (\`state\`);`)
  await db.run(sql`CREATE INDEX \`notifications_next_attempt_at_idx\` ON \`notifications\` (\`next_attempt_at\`);`)
  await db.run(sql`CREATE INDEX \`notifications_updated_at_idx\` ON \`notifications\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`notifications_created_at_idx\` ON \`notifications\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`tasks\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`description\` text,
    \`kind\` text DEFAULT 'reminder',
    \`due_at\` text NOT NULL,
    \`assignee_id\` integer NOT NULL,
    \`state\` text DEFAULT 'open',
    \`completed_at\` text,
    \`brief_id\` integer,
    \`content_path\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`brief_id\`) REFERENCES \`briefs\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_due_at_idx\` ON \`tasks\` (\`due_at\`);`)
  await db.run(sql`CREATE INDEX \`tasks_assignee_idx\` ON \`tasks\` (\`assignee_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_brief_idx\` ON \`tasks\` (\`brief_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_updated_at_idx\` ON \`tasks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tasks_created_at_idx\` ON \`tasks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`analytics_events\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`dedupe_key\` text NOT NULL,
    \`event\` text NOT NULL,
    \`day\` text NOT NULL,
    \`page_key\` text,
    \`step\` numeric,
    \`device\` text,
    \`source\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`analytics_events_dedupe_key_idx\` ON \`analytics_events\` (\`dedupe_key\`);`)
  await db.run(sql`CREATE INDEX \`analytics_events_event_idx\` ON \`analytics_events\` (\`event\`);`)
  await db.run(sql`CREATE INDEX \`analytics_events_day_idx\` ON \`analytics_events\` (\`day\`);`)
  await db.run(sql`CREATE INDEX \`analytics_events_updated_at_idx\` ON \`analytics_events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`analytics_events_created_at_idx\` ON \`analytics_events\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`submission_limits\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text NOT NULL,
    \`expires_at\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`submission_limits_key_idx\` ON \`submission_limits\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`submission_limits_expires_at_idx\` ON \`submission_limits\` (\`expires_at\`);`)
  await db.run(sql`CREATE INDEX \`submission_limits_updated_at_idx\` ON \`submission_limits\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`submission_limits_created_at_idx\` ON \`submission_limits\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`projects\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`description\` text,
    \`owner_id\` integer,
    \`status\` text DEFAULT 'preparation' NOT NULL,
    \`due_at\` text,
    \`budget\` numeric,
    \`archived\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`projects_owner_idx\` ON \`projects\` (\`owner_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_updated_at_idx\` ON \`projects\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`projects_created_at_idx\` ON \`projects\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`projects_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`projects_rels_order_idx\` ON \`projects_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_parent_idx\` ON \`projects_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_path_idx\` ON \`projects_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`projects_rels_users_id_idx\` ON \`projects_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`private_files\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`project_id\` integer NOT NULL,
    \`title\` text NOT NULL,
    \`kind\` text DEFAULT 'delivery',
    \`client_visible\` integer DEFAULT false,
    \`checksum\` text,
    \`expires_at\` text,
    \`revoked\` integer DEFAULT false,
    \`credits\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`url\` text,
    \`thumbnail_u_r_l\` text,
    \`filename\` text,
    \`mime_type\` text,
    \`filesize\` numeric,
    \`width\` numeric,
    \`height\` numeric,
    \`focal_x\` numeric,
    \`focal_y\` numeric,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`private_files_project_idx\` ON \`private_files\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`private_files_updated_at_idx\` ON \`private_files\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`private_files_created_at_idx\` ON \`private_files\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`private_files_filename_idx\` ON \`private_files\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`deliverables\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`project_id\` integer NOT NULL,
    \`title\` text NOT NULL,
    \`version\` text NOT NULL,
    \`file_id\` integer NOT NULL,
    \`note\` text,
    \`duration\` numeric,
    \`client_visible\` integer DEFAULT true,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`file_id\`) REFERENCES \`private_files\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`deliverables_project_idx\` ON \`deliverables\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_file_idx\` ON \`deliverables\` (\`file_id\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_updated_at_idx\` ON \`deliverables\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`deliverables_created_at_idx\` ON \`deliverables\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`video_comments\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`project_id\` integer NOT NULL,
    \`deliverable_id\` integer NOT NULL,
    \`author_id\` integer NOT NULL,
    \`body\` text NOT NULL,
    \`timecode\` numeric,
    \`recorded_at\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`deliverable_id\`) REFERENCES \`deliverables\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`video_comments_project_idx\` ON \`video_comments\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`video_comments_deliverable_idx\` ON \`video_comments\` (\`deliverable_id\`);`)
  await db.run(sql`CREATE INDEX \`video_comments_author_idx\` ON \`video_comments\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`video_comments_updated_at_idx\` ON \`video_comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`video_comments_created_at_idx\` ON \`video_comments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`approvals\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`project_id\` integer NOT NULL,
    \`deliverable_id\` integer NOT NULL,
    \`author_id\` integer NOT NULL,
    \`decision\` text NOT NULL,
    \`note\` text,
    \`recorded_at\` text NOT NULL,
    \`deduplication_key\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`deliverable_id\`) REFERENCES \`deliverables\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`approvals_project_idx\` ON \`approvals\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`approvals_deliverable_idx\` ON \`approvals\` (\`deliverable_id\`);`)
  await db.run(sql`CREATE INDEX \`approvals_author_idx\` ON \`approvals\` (\`author_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`approvals_deduplication_key_idx\` ON \`approvals\` (\`deduplication_key\`);`)
  await db.run(sql`CREATE INDEX \`approvals_updated_at_idx\` ON \`approvals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`approvals_created_at_idx\` ON \`approvals\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`file_shares\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`project_id\` integer NOT NULL,
    \`title\` text NOT NULL,
    \`file_id\` integer NOT NULL,
    \`token_hash\` text NOT NULL,
    \`expires_at\` text NOT NULL,
    \`revoked\` integer DEFAULT false,
    \`created_by_id\` integer NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`file_id\`) REFERENCES \`private_files\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`file_shares_project_idx\` ON \`file_shares\` (\`project_id\`);`)
  await db.run(sql`CREATE INDEX \`file_shares_file_idx\` ON \`file_shares\` (\`file_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`file_shares_token_hash_idx\` ON \`file_shares\` (\`token_hash\`);`)
  await db.run(sql`CREATE INDEX \`file_shares_created_by_idx\` ON \`file_shares\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`file_shares_updated_at_idx\` ON \`file_shares\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`file_shares_created_at_idx\` ON \`file_shares\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`commercial_portfolios_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`context\` text,
    \`media_id\` integer NOT NULL,
    \`rights_confirmed\` integer DEFAULT false NOT NULL,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`commercial_portfolios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_items_order_idx\` ON \`commercial_portfolios_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_items_parent_id_idx\` ON \`commercial_portfolios_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_items_media_idx\` ON \`commercial_portfolios_items\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`commercial_portfolios\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`introduction\` text,
    \`expires_at\` text NOT NULL,
    \`revoked\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_updated_at_idx\` ON \`commercial_portfolios\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_created_at_idx\` ON \`commercial_portfolios\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`commercial_portfolios_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`commercial_portfolios\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_rels_order_idx\` ON \`commercial_portfolios_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_rels_parent_idx\` ON \`commercial_portfolios_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_rels_path_idx\` ON \`commercial_portfolios_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`commercial_portfolios_rels_users_id_idx\` ON \`commercial_portfolios_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`ai_requests\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`request_key\` text NOT NULL,
    \`requested_by_id\` integer NOT NULL,
    \`task\` text NOT NULL,
    \`input\` text NOT NULL,
    \`output\` text,
    \`model\` text NOT NULL,
    \`status\` text DEFAULT 'pending' NOT NULL,
    \`error\` text,
    \`input_tokens\` numeric,
    \`output_tokens\` numeric,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`requested_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`ai_requests_request_key_idx\` ON \`ai_requests\` (\`request_key\`);`)
  await db.run(sql`CREATE INDEX \`ai_requests_requested_by_idx\` ON \`ai_requests\` (\`requested_by_id\`);`)
  await db.run(sql`CREATE INDEX \`ai_requests_updated_at_idx\` ON \`ai_requests\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`ai_requests_created_at_idx\` ON \`ai_requests\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`ai_budget_ledger\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`slot\` text NOT NULL,
    \`month\` text NOT NULL,
    \`sequence\` numeric NOT NULL,
    \`day\` text NOT NULL,
    \`day_count\` numeric NOT NULL,
    \`request_id\` integer NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`request_id\`) REFERENCES \`ai_requests\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`ai_budget_ledger_slot_idx\` ON \`ai_budget_ledger\` (\`slot\`);`)
  await db.run(sql`CREATE INDEX \`ai_budget_ledger_month_idx\` ON \`ai_budget_ledger\` (\`month\`);`)
  await db.run(sql`CREATE INDEX \`ai_budget_ledger_request_idx\` ON \`ai_budget_ledger\` (\`request_id\`);`)
  await db.run(sql`CREATE INDEX \`ai_budget_ledger_updated_at_idx\` ON \`ai_budget_ledger\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`ai_budget_ledger_created_at_idx\` ON \`ai_budget_ledger\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text NOT NULL,
    \`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs_log\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`executed_at\` text NOT NULL,
    \`completed_at\` text NOT NULL,
    \`task_slug\` text NOT NULL,
    \`task_i_d\` text NOT NULL,
    \`input\` text,
    \`output\` text,
    \`state\` text NOT NULL,
    \`error\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`payload_jobs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_order_idx\` ON \`payload_jobs_log\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_parent_id_idx\` ON \`payload_jobs_log\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`input\` text,
    \`completed_at\` text,
    \`total_tried\` numeric DEFAULT 0,
    \`has_error\` integer DEFAULT false,
    \`error\` text,
    \`task_slug\` text,
    \`queue\` text DEFAULT 'default',
    \`wait_until\` text,
    \`processing\` integer DEFAULT false,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_completed_at_idx\` ON \`payload_jobs\` (\`completed_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_total_tried_idx\` ON \`payload_jobs\` (\`total_tried\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_has_error_idx\` ON \`payload_jobs\` (\`has_error\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_task_slug_idx\` ON \`payload_jobs\` (\`task_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_queue_idx\` ON \`payload_jobs\` (\`queue\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_wait_until_idx\` ON \`payload_jobs\` (\`wait_until\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_processing_idx\` ON \`payload_jobs\` (\`processing\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_updated_at_idx\` ON \`payload_jobs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_created_at_idx\` ON \`payload_jobs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`global_slug\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` integer,
    \`pages_id\` integer,
    \`media_id\` integer,
    \`shared_sections_id\` integer,
    \`section_templates_id\` integer,
    \`redirects_id\` integer,
    \`audit_log_id\` integer,
    \`publication_releases_id\` integer,
    \`forms_id\` integer,
    \`crm_statuses_id\` integer,
    \`briefs_id\` integer,
    \`notifications_id\` integer,
    \`tasks_id\` integer,
    \`analytics_events_id\` integer,
    \`submission_limits_id\` integer,
    \`projects_id\` integer,
    \`private_files_id\` integer,
    \`deliverables_id\` integer,
    \`video_comments_id\` integer,
    \`approvals_id\` integer,
    \`file_shares_id\` integer,
    \`commercial_portfolios_id\` integer,
    \`ai_requests_id\` integer,
    \`ai_budget_ledger_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`shared_sections_id\`) REFERENCES \`shared_sections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`section_templates_id\`) REFERENCES \`section_templates\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`redirects_id\`) REFERENCES \`redirects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`audit_log_id\`) REFERENCES \`audit_log\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`publication_releases_id\`) REFERENCES \`publication_releases\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`forms_id\`) REFERENCES \`forms\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`crm_statuses_id\`) REFERENCES \`crm_statuses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`briefs_id\`) REFERENCES \`briefs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`notifications_id\`) REFERENCES \`notifications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`tasks_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`analytics_events_id\`) REFERENCES \`analytics_events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`submission_limits_id\`) REFERENCES \`submission_limits\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`private_files_id\`) REFERENCES \`private_files\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`deliverables_id\`) REFERENCES \`deliverables\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`video_comments_id\`) REFERENCES \`video_comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`approvals_id\`) REFERENCES \`approvals\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`file_shares_id\`) REFERENCES \`file_shares\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`commercial_portfolios_id\`) REFERENCES \`commercial_portfolios\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`ai_requests_id\`) REFERENCES \`ai_requests\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`ai_budget_ledger_id\`) REFERENCES \`ai_budget_ledger\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_shared_sections_id_idx\` ON \`payload_locked_documents_rels\` (\`shared_sections_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_section_templates_id_idx\` ON \`payload_locked_documents_rels\` (\`section_templates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_redirects_id_idx\` ON \`payload_locked_documents_rels\` (\`redirects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_audit_log_id_idx\` ON \`payload_locked_documents_rels\` (\`audit_log_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_publication_releases_id_idx\` ON \`payload_locked_documents_rels\` (\`publication_releases_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_forms_id_idx\` ON \`payload_locked_documents_rels\` (\`forms_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_crm_statuses_id_idx\` ON \`payload_locked_documents_rels\` (\`crm_statuses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_briefs_id_idx\` ON \`payload_locked_documents_rels\` (\`briefs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_notifications_id_idx\` ON \`payload_locked_documents_rels\` (\`notifications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tasks_id_idx\` ON \`payload_locked_documents_rels\` (\`tasks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_events_id_idx\` ON \`payload_locked_documents_rels\` (\`analytics_events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_submission_limits_id_idx\` ON \`payload_locked_documents_rels\` (\`submission_limits_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_projects_id_idx\` ON \`payload_locked_documents_rels\` (\`projects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_private_files_id_idx\` ON \`payload_locked_documents_rels\` (\`private_files_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deliverables_id_idx\` ON \`payload_locked_documents_rels\` (\`deliverables_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_video_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`video_comments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_approvals_id_idx\` ON \`payload_locked_documents_rels\` (\`approvals_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_file_shares_id_idx\` ON \`payload_locked_documents_rels\` (\`file_shares_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_commercial_portfolios_id_idx\` ON \`payload_locked_documents_rels\` (\`commercial_portfolios_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_ai_requests_id_idx\` ON \`payload_locked_documents_rels\` (\`ai_requests_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_ai_budget_ledger_id_idx\` ON \`payload_locked_documents_rels\` (\`ai_budget_ledger_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`users_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text,
    \`batch\` numeric,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_content_site\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text,
    \`full_name\` text,
    \`tagline\` text,
    \`city\` text,
    \`founded_year\` numeric,
    \`url\` text,
    \`email\` text,
    \`phone\` text,
    \`phone_e164\` text,
    \`address_street\` text,
    \`address_postal_code\` text,
    \`address_city\` text,
    \`address_country\` text,
    \`legal_legal_form\` text,
    \`legal_siret\` text,
    \`legal_vat_number\` text,
    \`legal_director\` text,
    \`legal_director_title\` text,
    \`social_instagram\` text,
    \`social_linkedin\` text,
    \`social_youtube\` text,
    \`hero_video_url\` text,
    \`host_name\` text,
    \`host_address\` text,
    \`host_website\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_site_order_idx\` ON \`site_content_site\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_site_parent_id_idx\` ON \`site_content_site\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_site_locale_idx\` ON \`site_content_site\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_identity\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`favicon\` text,
    \`shortcut_icon\` text,
    \`apple_icon\` text,
    \`share_image\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_identity_order_idx\` ON \`site_content_identity\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_identity_parent_id_idx\` ON \`site_content_identity\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_identity_locale_idx\` ON \`site_content_identity\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_appearance\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`gold\` text DEFAULT '#c9a961',
    \`gold_bright\` text DEFAULT '#e6c989',
    \`gold_deep\` text DEFAULT '#8a7340',
    \`background\` text DEFAULT '#050505',
    \`background_elevated\` text DEFAULT '#0c0c0c',
    \`background_subtle\` text DEFAULT '#111111',
    \`foreground\` text DEFAULT '#f5f3ee',
    \`foreground_muted\` text DEFAULT '#a8a39a',
    \`foreground_subtle\` text DEFAULT '#6b665e',
    \`serif_font\` text DEFAULT 'studio',
    \`sans_font\` text DEFAULT 'studio',
    \`spacing_scale\` numeric DEFAULT 1,
    \`animations\` integer DEFAULT true,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_appearance_order_idx\` ON \`site_content_appearance\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_appearance_parent_id_idx\` ON \`site_content_appearance\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_appearance_locale_idx\` ON \`site_content_appearance\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_not_found\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`seo_title\` text,
    \`seo_description\` text,
    \`eyebrow\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`description\` text,
    \`home_label\` text,
    \`home_href\` text,
    \`brief_label\` text,
    \`brief_href\` text,
    \`universes_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_not_found_order_idx\` ON \`site_content_not_found\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_not_found_parent_id_idx\` ON \`site_content_not_found\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_not_found_locale_idx\` ON \`site_content_not_found\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_navigation_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`href\` text,
    \`label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_navigation\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_navigation_links_order_idx\` ON \`site_content_navigation_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_navigation_links_parent_id_idx\` ON \`site_content_navigation_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_navigation_links_locale_idx\` ON \`site_content_navigation_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_navigation\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`logo\` text,
    \`logo_image\` text,
    \`logo_alt\` text,
    \`studio_label\` text,
    \`brief_label\` text,
    \`brief_href\` text,
    \`menu_open\` text,
    \`menu_close\` text,
    \`menu_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_navigation_order_idx\` ON \`site_content_navigation\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_navigation_parent_id_idx\` ON \`site_content_navigation\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_navigation_locale_idx\` ON \`site_content_navigation\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_footer_columns_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`href\` text,
    \`label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_footer_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_links_order_idx\` ON \`site_content_footer_columns_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_links_parent_id_idx\` ON \`site_content_footer_columns_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_links_locale_idx\` ON \`site_content_footer_columns_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_footer_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_order_idx\` ON \`site_content_footer_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_parent_id_idx\` ON \`site_content_footer_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_columns_locale_idx\` ON \`site_content_footer_columns\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_footer_social_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`label\` text,
    \`href\` text,
    \`icon\` text DEFAULT 'instagram',
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_footer_social_links_order_idx\` ON \`site_content_footer_social_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_social_links_parent_id_idx\` ON \`site_content_footer_social_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_social_links_locale_idx\` ON \`site_content_footer_social_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_footer\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`logo\` text,
    \`signature\` text,
    \`home_label\` text,
    \`studio_label\` text,
    \`since_label\` text,
    \`contact_label\` text,
    \`social_label\` text,
    \`rights_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_footer_order_idx\` ON \`site_content_footer\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_parent_id_idx\` ON \`site_content_footer\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_footer_locale_idx\` ON \`site_content_footer\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`studio_label\` text,
    \`first_verb\` text,
    \`first_rest\` text,
    \`second_verb\` text,
    \`second_rest\` text,
    \`third_verb\` text,
    \`third_rest\` text,
    \`showreel_label\` text,
    \`showreel_href\` text,
    \`universes_label\` text,
    \`universes_href\` text,
    \`on_air_label\` text,
    \`studio_eyebrow\` text,
    \`live_label\` text,
    \`scroll_label\` text,
    \`background_label\` text,
    \`poster\` text,
    \`autoplay\` integer,
    \`show_timecode\` integer,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_hero_order_idx\` ON \`site_content_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_hero_parent_id_idx\` ON \`site_content_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_hero_locale_idx\` ON \`site_content_hero\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_manifesto_pillars\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`number\` text,
    \`verb\` text,
    \`title\` text,
    \`body\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_manifesto\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_pillars_order_idx\` ON \`site_content_manifesto_pillars\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_pillars_parent_id_idx\` ON \`site_content_manifesto_pillars\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_pillars_locale_idx\` ON \`site_content_manifesto_pillars\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`introduction\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_order_idx\` ON \`site_content_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_parent_id_idx\` ON \`site_content_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_manifesto_locale_idx\` ON \`site_content_manifesto\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_stats_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`kicker\` text,
    \`prefix\` text,
    \`decimals\` numeric,
    \`value\` numeric,
    \`suffix\` text,
    \`label\` text,
    \`source\` text,
    \`verified\` integer,
    \`verified_at\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_stats\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_stats_items_order_idx\` ON \`site_content_stats_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_stats_items_parent_id_idx\` ON \`site_content_stats_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_stats_items_locale_idx\` ON \`site_content_stats_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`heading\` text,
    \`eyebrow\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_stats_order_idx\` ON \`site_content_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_stats_parent_id_idx\` ON \`site_content_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_stats_locale_idx\` ON \`site_content_stats\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_section_order_idx\` ON \`site_content_universes_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_section_parent_id_idx\` ON \`site_content_universes_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_section_locale_idx\` ON \`site_content_universes_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes_formulas_bullets\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_universes_formulas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_bullets_order_idx\` ON \`site_content_universes_formulas_bullets\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_bullets_parent_id_idx\` ON \`site_content_universes_formulas_bullets\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_bullets_locale_idx\` ON \`site_content_universes_formulas_bullets\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes_formulas\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`meta\` text,
    \`number\` text,
    \`title\` text,
    \`description\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_order_idx\` ON \`site_content_universes_formulas\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_parent_id_idx\` ON \`site_content_universes_formulas\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_formulas_locale_idx\` ON \`site_content_universes_formulas\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`category\` text,
    \`shape\` text DEFAULT 'wide',
    \`ambiance\` text DEFAULT 'warm',
    \`seed\` text,
    \`image_src\` text,
    \`video_src\` text,
    \`alt\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_portfolio_order_idx\` ON \`site_content_universes_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_portfolio_parent_id_idx\` ON \`site_content_universes_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_portfolio_locale_idx\` ON \`site_content_universes_portfolio\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes_card_highlights\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_card_highlights_order_idx\` ON \`site_content_universes_card_highlights\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_card_highlights_parent_id_idx\` ON \`site_content_universes_card_highlights\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_card_highlights_locale_idx\` ON \`site_content_universes_card_highlights\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`slug\` text,
    \`number\` text,
    \`eyebrow\` text,
    \`short_name\` text,
    \`title\` text,
    \`subtitle\` text,
    \`pitch\` text,
    \`intro\` text,
    \`ambiance\` text DEFAULT 'warm',
    \`card_number\` text,
    \`card_href\` text,
    \`card_eyebrow\` text,
    \`card_title\` text,
    \`card_tagline\` text,
    \`card_description\` text,
    \`card_image_src\` text,
    \`card_ambiance\` text DEFAULT 'warm',
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universes_order_idx\` ON \`site_content_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_parent_id_idx\` ON \`site_content_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universes_locale_idx\` ON \`site_content_universes\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_projects_tags\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_projects\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_projects_tags_order_idx\` ON \`site_content_projects_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_projects_tags_parent_id_idx\` ON \`site_content_projects_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_projects_tags_locale_idx\` ON \`site_content_projects_tags\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_projects\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`featured\` integer,
    \`duration\` text,
    \`slug\` text,
    \`number\` text,
    \`title\` text,
    \`client\` text,
    \`universe\` text,
    \`format\` text,
    \`year\` numeric,
    \`description\` text,
    \`seed\` text,
    \`shape\` text DEFAULT 'wide',
    \`image_src\` text,
    \`video_src\` text,
    \`alt\` text,
    \`source\` text,
    \`verified\` integer,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_projects_order_idx\` ON \`site_content_projects\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_projects_parent_id_idx\` ON \`site_content_projects\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_projects_locale_idx\` ON \`site_content_projects\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_portfolio_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`cta_label\` text,
    \`cta_href\` text,
    \`showreel_label\` text,
    \`open_label\` text,
    \`for_label\` text,
    \`limit\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_portfolio_section_order_idx\` ON \`site_content_portfolio_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_portfolio_section_parent_id_idx\` ON \`site_content_portfolio_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_portfolio_section_locale_idx\` ON \`site_content_portfolio_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text,
    \`universe\` text,
    \`verified\` integer,
    \`source\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_clients_order_idx\` ON \`site_content_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_clients_parent_id_idx\` ON \`site_content_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_clients_locale_idx\` ON \`site_content_clients\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_testimonials\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`quote\` text,
    \`author\` text,
    \`role\` text,
    \`organization\` text,
    \`universe\` text,
    \`project\` text,
    \`year\` numeric,
    \`verified\` integer,
    \`source\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_testimonials_order_idx\` ON \`site_content_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_testimonials_parent_id_idx\` ON \`site_content_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_testimonials_locale_idx\` ON \`site_content_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_clients_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`clients_label\` text,
    \`testimonial_prefix\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_clients_section_order_idx\` ON \`site_content_clients_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_clients_section_parent_id_idx\` ON \`site_content_clients_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_clients_section_locale_idx\` ON \`site_content_clients_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title\` text,
    \`subtitle\` text,
    \`description\` text,
    \`label\` text,
    \`href\` text,
    \`studio_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_cta_order_idx\` ON \`site_content_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_cta_parent_id_idx\` ON \`site_content_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_cta_locale_idx\` ON \`site_content_cta\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_universe_template\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`scroll_label\` text,
    \`manifesto_eyebrow\` text,
    \`formulas_eyebrow\` text,
    \`formulas_emphasis\` text,
    \`formulas_title\` text,
    \`portfolio_eyebrow\` text,
    \`portfolio_emphasis\` text,
    \`portfolio_title\` text,
    \`portfolio_subtitle\` text,
    \`portfolio_cta\` text,
    \`portfolio_href\` text,
    \`open_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_universe_template_order_idx\` ON \`site_content_universe_template\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universe_template_parent_id_idx\` ON \`site_content_universe_template\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_universe_template_locale_idx\` ON \`site_content_universe_template\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_pricing_services_formulas_bullets\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_pricing_services_formulas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_bullets_order_idx\` ON \`site_content_pricing_services_formulas_bullets\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_bullets_parent_id_idx\` ON \`site_content_pricing_services_formulas_bullets\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_bullets_locale_idx\` ON \`site_content_pricing_services_formulas_bullets\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_pricing_services_formulas\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`name\` text,
    \`price\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_pricing_services\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_order_idx\` ON \`site_content_pricing_services_formulas\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_parent_id_idx\` ON \`site_content_pricing_services_formulas\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_formulas_locale_idx\` ON \`site_content_pricing_services_formulas\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_pricing_services\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`caption\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_pricing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_order_idx\` ON \`site_content_pricing_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_parent_id_idx\` ON \`site_content_pricing_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_services_locale_idx\` ON \`site_content_pricing_services\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_pricing_addons\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`label\` text,
    \`price\` numeric,
    \`note\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content_pricing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_pricing_addons_order_idx\` ON \`site_content_pricing_addons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_addons_parent_id_idx\` ON \`site_content_pricing_addons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_addons_locale_idx\` ON \`site_content_pricing_addons\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`service_label\` text,
    \`drone_note\` text,
    \`addons_eyebrow\` text,
    \`addons_title\` text,
    \`addons_subtitle\` text,
    \`footer_note\` text,
    \`cta_label\` text,
    \`cta_href\` text,
    \`formula_cta\` text,
    \`featured_key\` text,
    \`featured_label\` text,
    \`currency\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_pricing_order_idx\` ON \`site_content_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_parent_id_idx\` ON \`site_content_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_pricing_locale_idx\` ON \`site_content_pricing\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content_ui\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`close_label\` text,
    \`video_label\` text,
    \`image_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content_ui_order_idx\` ON \`site_content_ui\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_content_ui_parent_id_idx\` ON \`site_content_ui\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_ui_locale_idx\` ON \`site_content_ui\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`site_content\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`source_revision\` text,
    \`_status\` text DEFAULT 'draft',
    \`updated_at\` text,
    \`created_at\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`site_content__status_idx\` ON \`site_content\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`site_content_locales\` (
    \`translation_state\` text DEFAULT 'source',
    \`reviewed_source_revision\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`site_content_locales_locale_parent_id_unique\` ON \`site_content_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`site_content_locales_parent_id_idx\` ON \`site_content_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_site\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text,
    \`full_name\` text,
    \`tagline\` text,
    \`city\` text,
    \`founded_year\` numeric,
    \`url\` text,
    \`email\` text,
    \`phone\` text,
    \`phone_e164\` text,
    \`address_street\` text,
    \`address_postal_code\` text,
    \`address_city\` text,
    \`address_country\` text,
    \`legal_legal_form\` text,
    \`legal_siret\` text,
    \`legal_vat_number\` text,
    \`legal_director\` text,
    \`legal_director_title\` text,
    \`social_instagram\` text,
    \`social_linkedin\` text,
    \`social_youtube\` text,
    \`hero_video_url\` text,
    \`host_name\` text,
    \`host_address\` text,
    \`host_website\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_site_order_idx\` ON \`_site_content_v_version_site\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_site_parent_id_idx\` ON \`_site_content_v_version_site\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_site_locale_idx\` ON \`_site_content_v_version_site\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_identity\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`favicon\` text,
    \`shortcut_icon\` text,
    \`apple_icon\` text,
    \`share_image\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_identity_order_idx\` ON \`_site_content_v_version_identity\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_identity_parent_id_idx\` ON \`_site_content_v_version_identity\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_identity_locale_idx\` ON \`_site_content_v_version_identity\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_appearance\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`gold\` text DEFAULT '#c9a961',
    \`gold_bright\` text DEFAULT '#e6c989',
    \`gold_deep\` text DEFAULT '#8a7340',
    \`background\` text DEFAULT '#050505',
    \`background_elevated\` text DEFAULT '#0c0c0c',
    \`background_subtle\` text DEFAULT '#111111',
    \`foreground\` text DEFAULT '#f5f3ee',
    \`foreground_muted\` text DEFAULT '#a8a39a',
    \`foreground_subtle\` text DEFAULT '#6b665e',
    \`serif_font\` text DEFAULT 'studio',
    \`sans_font\` text DEFAULT 'studio',
    \`spacing_scale\` numeric DEFAULT 1,
    \`animations\` integer DEFAULT true,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_appearance_order_idx\` ON \`_site_content_v_version_appearance\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_appearance_parent_id_idx\` ON \`_site_content_v_version_appearance\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_appearance_locale_idx\` ON \`_site_content_v_version_appearance\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_not_found\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`seo_title\` text,
    \`seo_description\` text,
    \`eyebrow\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`description\` text,
    \`home_label\` text,
    \`home_href\` text,
    \`brief_label\` text,
    \`brief_href\` text,
    \`universes_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_not_found_order_idx\` ON \`_site_content_v_version_not_found\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_not_found_parent_id_idx\` ON \`_site_content_v_version_not_found\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_not_found_locale_idx\` ON \`_site_content_v_version_not_found\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_navigation_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`href\` text,
    \`label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_navigation\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_links_order_idx\` ON \`_site_content_v_version_navigation_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_links_parent_id_idx\` ON \`_site_content_v_version_navigation_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_links_locale_idx\` ON \`_site_content_v_version_navigation_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_navigation\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`logo\` text,
    \`logo_image\` text,
    \`logo_alt\` text,
    \`studio_label\` text,
    \`brief_label\` text,
    \`brief_href\` text,
    \`menu_open\` text,
    \`menu_close\` text,
    \`menu_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_order_idx\` ON \`_site_content_v_version_navigation\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_parent_id_idx\` ON \`_site_content_v_version_navigation\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_navigation_locale_idx\` ON \`_site_content_v_version_navigation\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_footer_columns_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`href\` text,
    \`label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_footer_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_links_order_idx\` ON \`_site_content_v_version_footer_columns_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_links_parent_id_idx\` ON \`_site_content_v_version_footer_columns_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_links_locale_idx\` ON \`_site_content_v_version_footer_columns_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_footer_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_order_idx\` ON \`_site_content_v_version_footer_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_parent_id_idx\` ON \`_site_content_v_version_footer_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_columns_locale_idx\` ON \`_site_content_v_version_footer_columns\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_footer_social_links\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`label\` text,
    \`href\` text,
    \`icon\` text DEFAULT 'instagram',
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_social_links_order_idx\` ON \`_site_content_v_version_footer_social_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_social_links_parent_id_idx\` ON \`_site_content_v_version_footer_social_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_social_links_locale_idx\` ON \`_site_content_v_version_footer_social_links\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_footer\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`logo\` text,
    \`signature\` text,
    \`home_label\` text,
    \`studio_label\` text,
    \`since_label\` text,
    \`contact_label\` text,
    \`social_label\` text,
    \`rights_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_order_idx\` ON \`_site_content_v_version_footer\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_parent_id_idx\` ON \`_site_content_v_version_footer\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_footer_locale_idx\` ON \`_site_content_v_version_footer\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_hero\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`studio_label\` text,
    \`first_verb\` text,
    \`first_rest\` text,
    \`second_verb\` text,
    \`second_rest\` text,
    \`third_verb\` text,
    \`third_rest\` text,
    \`showreel_label\` text,
    \`showreel_href\` text,
    \`universes_label\` text,
    \`universes_href\` text,
    \`on_air_label\` text,
    \`studio_eyebrow\` text,
    \`live_label\` text,
    \`scroll_label\` text,
    \`background_label\` text,
    \`poster\` text,
    \`autoplay\` integer,
    \`show_timecode\` integer,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_hero_order_idx\` ON \`_site_content_v_version_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_hero_parent_id_idx\` ON \`_site_content_v_version_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_hero_locale_idx\` ON \`_site_content_v_version_hero\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_manifesto_pillars\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`number\` text,
    \`verb\` text,
    \`title\` text,
    \`body\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_manifesto\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_pillars_order_idx\` ON \`_site_content_v_version_manifesto_pillars\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_pillars_parent_id_idx\` ON \`_site_content_v_version_manifesto_pillars\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_pillars_locale_idx\` ON \`_site_content_v_version_manifesto_pillars\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_manifesto\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`introduction\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_order_idx\` ON \`_site_content_v_version_manifesto\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_parent_id_idx\` ON \`_site_content_v_version_manifesto\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_manifesto_locale_idx\` ON \`_site_content_v_version_manifesto\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_stats_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`kicker\` text,
    \`prefix\` text,
    \`decimals\` numeric,
    \`value\` numeric,
    \`suffix\` text,
    \`label\` text,
    \`source\` text,
    \`verified\` integer,
    \`verified_at\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_stats\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_items_order_idx\` ON \`_site_content_v_version_stats_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_items_parent_id_idx\` ON \`_site_content_v_version_stats_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_items_locale_idx\` ON \`_site_content_v_version_stats_items\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_stats\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`heading\` text,
    \`eyebrow\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_order_idx\` ON \`_site_content_v_version_stats\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_parent_id_idx\` ON \`_site_content_v_version_stats\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_stats_locale_idx\` ON \`_site_content_v_version_stats\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_section_order_idx\` ON \`_site_content_v_version_universes_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_section_parent_id_idx\` ON \`_site_content_v_version_universes_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_section_locale_idx\` ON \`_site_content_v_version_universes_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes_formulas_bullets\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_universes_formulas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_bullets_order_idx\` ON \`_site_content_v_version_universes_formulas_bullets\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_bullets_parent_id_idx\` ON \`_site_content_v_version_universes_formulas_bullets\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_bullets_locale_idx\` ON \`_site_content_v_version_universes_formulas_bullets\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes_formulas\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`meta\` text,
    \`number\` text,
    \`title\` text,
    \`description\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_order_idx\` ON \`_site_content_v_version_universes_formulas\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_parent_id_idx\` ON \`_site_content_v_version_universes_formulas\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_formulas_locale_idx\` ON \`_site_content_v_version_universes_formulas\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes_portfolio\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`category\` text,
    \`shape\` text DEFAULT 'wide',
    \`ambiance\` text DEFAULT 'warm',
    \`seed\` text,
    \`image_src\` text,
    \`video_src\` text,
    \`alt\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_portfolio_order_idx\` ON \`_site_content_v_version_universes_portfolio\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_portfolio_parent_id_idx\` ON \`_site_content_v_version_universes_portfolio\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_portfolio_locale_idx\` ON \`_site_content_v_version_universes_portfolio\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes_card_highlights\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_universes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_card_highlights_order_idx\` ON \`_site_content_v_version_universes_card_highlights\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_card_highlights_parent_id_idx\` ON \`_site_content_v_version_universes_card_highlights\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_card_highlights_locale_idx\` ON \`_site_content_v_version_universes_card_highlights\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`slug\` text,
    \`number\` text,
    \`eyebrow\` text,
    \`short_name\` text,
    \`title\` text,
    \`subtitle\` text,
    \`pitch\` text,
    \`intro\` text,
    \`ambiance\` text DEFAULT 'warm',
    \`card_number\` text,
    \`card_href\` text,
    \`card_eyebrow\` text,
    \`card_title\` text,
    \`card_tagline\` text,
    \`card_description\` text,
    \`card_image_src\` text,
    \`card_ambiance\` text DEFAULT 'warm',
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_order_idx\` ON \`_site_content_v_version_universes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_parent_id_idx\` ON \`_site_content_v_version_universes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universes_locale_idx\` ON \`_site_content_v_version_universes\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_projects_tags\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_projects\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_tags_order_idx\` ON \`_site_content_v_version_projects_tags\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_tags_parent_id_idx\` ON \`_site_content_v_version_projects_tags\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_tags_locale_idx\` ON \`_site_content_v_version_projects_tags\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_projects\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`featured\` integer,
    \`duration\` text,
    \`slug\` text,
    \`number\` text,
    \`title\` text,
    \`client\` text,
    \`universe\` text,
    \`format\` text,
    \`year\` numeric,
    \`description\` text,
    \`seed\` text,
    \`shape\` text DEFAULT 'wide',
    \`image_src\` text,
    \`video_src\` text,
    \`alt\` text,
    \`source\` text,
    \`verified\` integer,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_order_idx\` ON \`_site_content_v_version_projects\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_parent_id_idx\` ON \`_site_content_v_version_projects\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_projects_locale_idx\` ON \`_site_content_v_version_projects\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_portfolio_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`cta_label\` text,
    \`cta_href\` text,
    \`showreel_label\` text,
    \`open_label\` text,
    \`for_label\` text,
    \`limit\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_portfolio_section_order_idx\` ON \`_site_content_v_version_portfolio_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_portfolio_section_parent_id_idx\` ON \`_site_content_v_version_portfolio_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_portfolio_section_locale_idx\` ON \`_site_content_v_version_portfolio_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_clients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text,
    \`universe\` text,
    \`verified\` integer,
    \`source\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_order_idx\` ON \`_site_content_v_version_clients\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_parent_id_idx\` ON \`_site_content_v_version_clients\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_locale_idx\` ON \`_site_content_v_version_clients\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_testimonials\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`quote\` text,
    \`author\` text,
    \`role\` text,
    \`organization\` text,
    \`universe\` text,
    \`project\` text,
    \`year\` numeric,
    \`verified\` integer,
    \`source\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_testimonials_order_idx\` ON \`_site_content_v_version_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_testimonials_parent_id_idx\` ON \`_site_content_v_version_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_testimonials_locale_idx\` ON \`_site_content_v_version_testimonials\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_clients_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`clients_label\` text,
    \`testimonial_prefix\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_section_order_idx\` ON \`_site_content_v_version_clients_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_section_parent_id_idx\` ON \`_site_content_v_version_clients_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_clients_section_locale_idx\` ON \`_site_content_v_version_clients_section\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_cta\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title\` text,
    \`subtitle\` text,
    \`description\` text,
    \`label\` text,
    \`href\` text,
    \`studio_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_cta_order_idx\` ON \`_site_content_v_version_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_cta_parent_id_idx\` ON \`_site_content_v_version_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_cta_locale_idx\` ON \`_site_content_v_version_cta\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_universe_template\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`scroll_label\` text,
    \`manifesto_eyebrow\` text,
    \`formulas_eyebrow\` text,
    \`formulas_emphasis\` text,
    \`formulas_title\` text,
    \`portfolio_eyebrow\` text,
    \`portfolio_emphasis\` text,
    \`portfolio_title\` text,
    \`portfolio_subtitle\` text,
    \`portfolio_cta\` text,
    \`portfolio_href\` text,
    \`open_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universe_template_order_idx\` ON \`_site_content_v_version_universe_template\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universe_template_parent_id_idx\` ON \`_site_content_v_version_universe_template\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_universe_template_locale_idx\` ON \`_site_content_v_version_universe_template\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_pricing_services_formulas_bullets\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_pricing_services_formulas\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_bullets_order_idx\` ON \`_site_content_v_version_pricing_services_formulas_bullets\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_bullets_parent_id_idx\` ON \`_site_content_v_version_pricing_services_formulas_bullets\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_bullets_locale_idx\` ON \`_site_content_v_version_pricing_services_formulas_bullets\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_pricing_services_formulas\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`name\` text,
    \`price\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_pricing_services\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_order_idx\` ON \`_site_content_v_version_pricing_services_formulas\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_parent_id_idx\` ON \`_site_content_v_version_pricing_services_formulas\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_formulas_locale_idx\` ON \`_site_content_v_version_pricing_services_formulas\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_pricing_services\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`label\` text,
    \`caption\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_pricing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_order_idx\` ON \`_site_content_v_version_pricing_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_parent_id_idx\` ON \`_site_content_v_version_pricing_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_services_locale_idx\` ON \`_site_content_v_version_pricing_services\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_pricing_addons\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`label\` text,
    \`price\` numeric,
    \`note\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v_version_pricing\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_addons_order_idx\` ON \`_site_content_v_version_pricing_addons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_addons_parent_id_idx\` ON \`_site_content_v_version_pricing_addons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_addons_locale_idx\` ON \`_site_content_v_version_pricing_addons\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_pricing\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`eyebrow\` text,
    \`title_before\` text,
    \`title_emphasis\` text,
    \`title_after\` text,
    \`subtitle\` text,
    \`service_label\` text,
    \`drone_note\` text,
    \`addons_eyebrow\` text,
    \`addons_title\` text,
    \`addons_subtitle\` text,
    \`footer_note\` text,
    \`cta_label\` text,
    \`cta_href\` text,
    \`formula_cta\` text,
    \`featured_key\` text,
    \`featured_label\` text,
    \`currency\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_order_idx\` ON \`_site_content_v_version_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_parent_id_idx\` ON \`_site_content_v_version_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_pricing_locale_idx\` ON \`_site_content_v_version_pricing\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_version_ui\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_locale\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`close_label\` text,
    \`video_label\` text,
    \`image_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_ui_order_idx\` ON \`_site_content_v_version_ui\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_ui_parent_id_idx\` ON \`_site_content_v_version_ui\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_ui_locale_idx\` ON \`_site_content_v_version_ui\` (\`_locale\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`version_source_revision\` text,
    \`version__status\` text DEFAULT 'draft',
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`snapshot\` integer,
    \`published_locale\` text,
    \`latest\` integer,
    \`autosave\` integer
  );
  `)
  await db.run(sql`CREATE INDEX \`_site_content_v_version_version__status_idx\` ON \`_site_content_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_created_at_idx\` ON \`_site_content_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_updated_at_idx\` ON \`_site_content_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_snapshot_idx\` ON \`_site_content_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_published_locale_idx\` ON \`_site_content_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_latest_idx\` ON \`_site_content_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_autosave_idx\` ON \`_site_content_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_site_content_v_locales\` (
    \`version_translation_state\` text DEFAULT 'source',
    \`version_reviewed_source_revision\` text,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_locale\` text NOT NULL,
    \`_parent_id\` integer NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_site_content_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_site_content_v_locales_locale_parent_id_unique\` ON \`_site_content_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_site_content_v_locales_parent_id_idx\` ON \`_site_content_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`ai_settings\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`enabled\` integer DEFAULT false,
    \`model\` text,
    \`daily_requests\` numeric DEFAULT 20 NOT NULL,
    \`monthly_requests\` numeric DEFAULT 200 NOT NULL,
    \`max_input_characters\` numeric DEFAULT 6000 NOT NULL,
    \`max_output_tokens\` numeric DEFAULT 1200 NOT NULL,
    \`updated_at\` text,
    \`created_at\` text
  );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_manifesto\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_stats\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_universes\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_portfolio\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_clients\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_universe\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_legal_sections\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_legal_sections_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_legal\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_legal_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_editorial\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_editorial_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_columns_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_columns_items_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery_items_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq_items_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_steps_items_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_shared\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_manifesto\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_stats\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_universes\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_portfolio\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_clients\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_universe\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_legal_sections\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_legal_sections_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_legal\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_legal_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_editorial\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_editorial_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_columns_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_columns_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_steps_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_shared\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_locales\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`media_locales\`;`)
  await db.run(sql`DROP TABLE \`media_texts\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_manifesto\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_stats\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_universes\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_portfolio\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_clients\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_universe\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_legal_sections\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_legal_sections_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_legal\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_legal_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_editorial\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_editorial_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_columns_items\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_columns_items_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_gallery_items\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_gallery_items_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_gallery_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_faq_items\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_faq_items_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_faq_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_steps_items_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`shared_sections_blocks_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`shared_sections\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_manifesto\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_stats\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_universes\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_portfolio\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_clients\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_universe\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_legal_sections\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_legal_sections_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_legal\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_legal_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_editorial\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_editorial_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_columns_items\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_columns_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_gallery_items\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_gallery_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_gallery_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_faq_items\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_faq_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_faq_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_steps_items_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v_blocks_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`_shared_sections_v\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_manifesto\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_stats\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_universes\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_portfolio\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_clients\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_universe\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_legal_sections\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_legal_sections_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_legal\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_legal_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_editorial\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_editorial_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_columns_items\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_columns_items_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_columns\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_gallery_items\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_gallery_items_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_gallery_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_faq_items\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_faq_items_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_faq_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_steps_items_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_steps_locales\`;`)
  await db.run(sql`DROP TABLE \`section_templates_blocks_shared\`;`)
  await db.run(sql`DROP TABLE \`section_templates\`;`)
  await db.run(sql`DROP TABLE \`redirects\`;`)
  await db.run(sql`DROP TABLE \`audit_log\`;`)
  await db.run(sql`DROP TABLE \`publication_releases\`;`)
  await db.run(sql`DROP TABLE \`forms_steps\`;`)
  await db.run(sql`DROP TABLE \`forms_fields_options\`;`)
  await db.run(sql`DROP TABLE \`forms_fields_condition_values\`;`)
  await db.run(sql`DROP TABLE \`forms_fields\`;`)
  await db.run(sql`DROP TABLE \`forms_notification_recipients\`;`)
  await db.run(sql`DROP TABLE \`forms\`;`)
  await db.run(sql`DROP TABLE \`_forms_v_version_steps\`;`)
  await db.run(sql`DROP TABLE \`_forms_v_version_fields_options\`;`)
  await db.run(sql`DROP TABLE \`_forms_v_version_fields_condition_values\`;`)
  await db.run(sql`DROP TABLE \`_forms_v_version_fields\`;`)
  await db.run(sql`DROP TABLE \`_forms_v_version_notification_recipients\`;`)
  await db.run(sql`DROP TABLE \`_forms_v\`;`)
  await db.run(sql`DROP TABLE \`crm_statuses\`;`)
  await db.run(sql`DROP TABLE \`crm_statuses_rels\`;`)
  await db.run(sql`DROP TABLE \`briefs_notes\`;`)
  await db.run(sql`DROP TABLE \`briefs\`;`)
  await db.run(sql`DROP TABLE \`notifications\`;`)
  await db.run(sql`DROP TABLE \`tasks\`;`)
  await db.run(sql`DROP TABLE \`analytics_events\`;`)
  await db.run(sql`DROP TABLE \`submission_limits\`;`)
  await db.run(sql`DROP TABLE \`projects\`;`)
  await db.run(sql`DROP TABLE \`projects_rels\`;`)
  await db.run(sql`DROP TABLE \`private_files\`;`)
  await db.run(sql`DROP TABLE \`deliverables\`;`)
  await db.run(sql`DROP TABLE \`video_comments\`;`)
  await db.run(sql`DROP TABLE \`approvals\`;`)
  await db.run(sql`DROP TABLE \`file_shares\`;`)
  await db.run(sql`DROP TABLE \`commercial_portfolios_items\`;`)
  await db.run(sql`DROP TABLE \`commercial_portfolios\`;`)
  await db.run(sql`DROP TABLE \`commercial_portfolios_rels\`;`)
  await db.run(sql`DROP TABLE \`ai_requests\`;`)
  await db.run(sql`DROP TABLE \`ai_budget_ledger\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs_log\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site_content_site\`;`)
  await db.run(sql`DROP TABLE \`site_content_identity\`;`)
  await db.run(sql`DROP TABLE \`site_content_appearance\`;`)
  await db.run(sql`DROP TABLE \`site_content_not_found\`;`)
  await db.run(sql`DROP TABLE \`site_content_navigation_links\`;`)
  await db.run(sql`DROP TABLE \`site_content_navigation\`;`)
  await db.run(sql`DROP TABLE \`site_content_footer_columns_links\`;`)
  await db.run(sql`DROP TABLE \`site_content_footer_columns\`;`)
  await db.run(sql`DROP TABLE \`site_content_footer_social_links\`;`)
  await db.run(sql`DROP TABLE \`site_content_footer\`;`)
  await db.run(sql`DROP TABLE \`site_content_hero\`;`)
  await db.run(sql`DROP TABLE \`site_content_manifesto_pillars\`;`)
  await db.run(sql`DROP TABLE \`site_content_manifesto\`;`)
  await db.run(sql`DROP TABLE \`site_content_stats_items\`;`)
  await db.run(sql`DROP TABLE \`site_content_stats\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes_section\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes_formulas_bullets\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes_formulas\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes_portfolio\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes_card_highlights\`;`)
  await db.run(sql`DROP TABLE \`site_content_universes\`;`)
  await db.run(sql`DROP TABLE \`site_content_projects_tags\`;`)
  await db.run(sql`DROP TABLE \`site_content_projects\`;`)
  await db.run(sql`DROP TABLE \`site_content_portfolio_section\`;`)
  await db.run(sql`DROP TABLE \`site_content_clients\`;`)
  await db.run(sql`DROP TABLE \`site_content_testimonials\`;`)
  await db.run(sql`DROP TABLE \`site_content_clients_section\`;`)
  await db.run(sql`DROP TABLE \`site_content_cta\`;`)
  await db.run(sql`DROP TABLE \`site_content_universe_template\`;`)
  await db.run(sql`DROP TABLE \`site_content_pricing_services_formulas_bullets\`;`)
  await db.run(sql`DROP TABLE \`site_content_pricing_services_formulas\`;`)
  await db.run(sql`DROP TABLE \`site_content_pricing_services\`;`)
  await db.run(sql`DROP TABLE \`site_content_pricing_addons\`;`)
  await db.run(sql`DROP TABLE \`site_content_pricing\`;`)
  await db.run(sql`DROP TABLE \`site_content_ui\`;`)
  await db.run(sql`DROP TABLE \`site_content\`;`)
  await db.run(sql`DROP TABLE \`site_content_locales\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_site\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_identity\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_appearance\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_not_found\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_navigation_links\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_navigation\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_footer_columns_links\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_footer_columns\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_footer_social_links\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_footer\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_hero\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_manifesto_pillars\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_manifesto\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_stats_items\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_stats\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes_section\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes_formulas_bullets\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes_formulas\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes_portfolio\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes_card_highlights\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universes\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_projects_tags\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_projects\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_portfolio_section\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_clients\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_testimonials\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_clients_section\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_cta\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_universe_template\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_pricing_services_formulas_bullets\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_pricing_services_formulas\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_pricing_services\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_pricing_addons\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_pricing\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_version_ui\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v\`;`)
  await db.run(sql`DROP TABLE \`_site_content_v_locales\`;`)
  await db.run(sql`DROP TABLE \`ai_settings\`;`)
}
