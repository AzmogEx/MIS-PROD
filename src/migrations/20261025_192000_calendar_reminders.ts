import { type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/** Keep legacy notifications, IDs and their document locks while making briefs
 * optional for task reminders. Payload runs this inside its migration transaction. */
export async function up({ db }: MigrateUpArgs) {
  await db.run(sql`ALTER TABLE tasks ADD notify_assignee integer DEFAULT false`)
  await db.run(sql`ALTER TABLE tasks ADD notify_minutes_before numeric DEFAULT 0`)
  await db.run(sql`ALTER TABLE tasks ADD notify_at text`)
  await db.run(sql`CREATE INDEX tasks_notify_at_idx ON tasks (notify_at)`)
  await db.run(sql`CREATE TEMP TABLE calendar_notification_locks AS SELECT * FROM payload_locked_documents_rels WHERE notifications_id IS NOT NULL`)
  await db.run(sql`DELETE FROM payload_locked_documents_rels WHERE notifications_id IS NOT NULL`)
  await db.run(sql`CREATE TABLE notifications_calendar (
    id integer PRIMARY KEY NOT NULL,
    dedupe_key text NOT NULL,
    brief_id integer,
    kind text NOT NULL,
    subject text NOT NULL,
    recipients text NOT NULL,
    body text NOT NULL,
    state text DEFAULT 'pending' NOT NULL,
    attempts numeric DEFAULT 0,
    next_attempt_at text,
    lease_until text,
    claim_token text,
    first_attempt_at text,
    delivered_at text,
    provider_id text,
    error text,
    retry_now integer DEFAULT false,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    task_id integer,
    FOREIGN KEY (brief_id) REFERENCES briefs(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON UPDATE no action ON DELETE set null
  )`)
  await db.run(sql`INSERT INTO notifications_calendar SELECT *, NULL FROM notifications`)
  await db.run(sql`DROP TABLE notifications`)
  await db.run(sql`ALTER TABLE notifications_calendar RENAME TO notifications`)
  await db.run(sql`CREATE UNIQUE INDEX notifications_dedupe_key_idx ON notifications (dedupe_key)`)
  await db.run(sql`CREATE INDEX notifications_brief_idx ON notifications (brief_id)`)
  await db.run(sql`CREATE INDEX notifications_task_idx ON notifications (task_id)`)
  await db.run(sql`CREATE INDEX notifications_state_idx ON notifications (state)`)
  await db.run(sql`CREATE INDEX notifications_next_attempt_at_idx ON notifications (next_attempt_at)`)
  await db.run(sql`CREATE INDEX notifications_updated_at_idx ON notifications (updated_at)`)
  await db.run(sql`CREATE INDEX notifications_created_at_idx ON notifications (created_at)`)
  await db.run(sql`INSERT INTO payload_locked_documents_rels SELECT * FROM calendar_notification_locks`)
  await db.run(sql`DROP TABLE calendar_notification_locks`)
}

export async function down() {
  throw new Error('Cette migration conserve des rappels sans brief. Pour revenir à la version précédente, restaurez ensemble la sauvegarde des données et la version applicative ; aucune suppression automatique des rappels.')
}
