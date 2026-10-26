import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildConfig, getPayload, type CollectionBeforeChangeHook, type Payload } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { operationCollections } from '../src/cms/operation-collections';
import { initialBriefForm, validateFormAnswers, validateFormDefinition } from '../src/cms/form-schema';
import { csvCell, getOperationsSnapshot, getPublishedForm, mutateOperation, operationsCSV, parisLocalToUTC, processNotificationOutbox, recordBrowserEvent, seedOperations, SubmissionError, submitBrief } from '../src/cms/operations';
import { notificationRetryExpired } from '../src/cms/notification-policy';
import { installTransactionQueue } from '../src/cms/transaction-queue';

test('CRM, formulaires et notifications : stockage SQLite réel et permissions', async (t) => {
  const directory = path.resolve('.data', `test-operations-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  let rejectOutbox = false;
  const failOutbox: CollectionBeforeChangeHook = ({ data, operation }) => { if (rejectOutbox && operation === 'create') throw new Error('Échec de stockage outbox imposé par le test'); return data; };
  const config = buildConfig({
    onInit: async payload => installTransactionQueue(payload),
    secret: randomBytes(32).toString('hex'), telemetry: false,
    admin: { disable: true },
    typescript: { autoGenerate: false }, graphQL: { disable: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}` }, push: true, busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
    collections: [
      { slug: 'users', auth: true, fields: [{ name: 'name', type: 'text' }, { name: 'role', type: 'select', options: ['owner', 'admin', 'editor', 'sales', 'contributor', 'client'] }] },
      { slug: 'pages', versions: { drafts: true }, fields: [{ name: 'path', type: 'text' }] },
      ...operationCollections.map((collection) => collection.slug === 'notifications' ? { ...collection, hooks: { ...collection.hooks, beforeChange: [...(collection.hooks?.beforeChange || []), failOutbox] } } : collection),
    ],
  });
  const payload: Payload = await getPayload({ config });
  const body = { answers: { universe: 'entreprises', name: 'Recette MIS', email: 'recette@example.invalid', message: 'Demande de test locale, sans destinataire réel.', organization: 'Données de test', residentName: 'Champ caché à éliminer' } };
  try {
    await t.test('import idempotent sans écraser les modifications éditoriales', async () => {
      await seedOperations(payload);
      const form = await getPublishedForm(payload);
      assert.ok(form?.id);
      await payload.update({ collection: 'forms', id: form.id, data: { title: 'Titre corrigé', _status: 'published' }, overrideAccess: true });
      await seedOperations(payload);
      assert.equal((await payload.count({ collection: 'forms', overrideAccess: true })).totalDocs, 1);
      assert.equal((await payload.count({ collection: 'crm-statuses', overrideAccess: true })).totalDocs, 5);
      assert.equal((await getPublishedForm(payload))?.title, 'Titre corrigé');
    });

    await t.test('brouillon isolé et champs conditionnels validés côté serveur', async () => {
      const form = await getPublishedForm(payload);
      assert.ok(form?.id);
      await payload.update({ collection: 'forms', id: form.id, draft: true, data: { title: 'Titre non publié', _status: 'draft' }, overrideAccess: true });
      assert.equal((await getPublishedForm(payload))?.title, 'Titre corrigé');
      const validated = validateFormAnswers(form, body.answers);
      assert.deepEqual(validated.errors, {});
      assert.equal('residentName' in validated.answers, false);
      const invalid = validateFormAnswers(form, { ...body.answers, universe: 'univers-inconnu', email: 'invalide' });
      assert.ok(invalid.errors.universe);
      assert.ok(invalid.errors.email);
      const broken = structuredClone(initialBriefForm);
      broken.fields[0].conditionField = 'email';
      assert.match(validateFormDefinition(broken) || '', /champ antérieur/);
    });

    const idempotencyKey = randomUUID();
    await t.test('réception atomique, schéma figé et déduplication durable', async () => {
      const first = await submitBrief(payload, { body, idempotencyKey, rateKey: 'test-source-a' });
      const retry = await submitBrief(payload, { body, idempotencyKey, rateKey: 'test-source-a' });
      assert.equal(first.duplicate, false);
      assert.equal(retry.duplicate, true);
      const briefs = await payload.find({ collection: 'briefs', depth: 0, overrideAccess: true });
      assert.equal(briefs.totalDocs, 1);
      assert.equal((await payload.count({ collection: 'notifications', overrideAccess: true })).totalDocs, 1);
      assert.equal((await payload.count({ collection: 'analytics-events', overrideAccess: true })).totalDocs, 1);
      assert.equal((briefs.docs[0].schemaSnapshot as { title: string }).title, 'Titre corrigé');
      assert.equal('residentName' in (briefs.docs[0].answers as Record<string, unknown>), false);
      await assert.rejects(() => submitBrief(payload, { body: { answers: { ...body.answers, name: 'Un autre nom' } }, idempotencyKey, rateKey: 'test-source-a' }), (error: unknown) => error instanceof SubmissionError && error.status === 409);
    });

    await t.test('un échec email préserve le brief ; la reprise ne renvoie pas une notification traitée', async () => {
      const failure = await processNotificationOutbox(payload, { send: async () => { throw new Error('Service de test indisponible'); } });
      assert.equal(failure.failed, 1);
      assert.equal((await payload.count({ collection: 'briefs', overrideAccess: true })).totalDocs, 1);
      const pending = await payload.find({ collection: 'notifications', overrideAccess: true });
      await payload.update({ collection: 'notifications', id: pending.docs[0].id, data: { nextAttemptAt: new Date(0).toISOString() }, overrideAccess: true });
      let delivered = 0;
      const transport = { send: async () => { delivered += 1; return { providerId: 'local-capture', captured: true }; } };
      assert.equal((await processNotificationOutbox(payload, transport)).processed, 1);
      await processNotificationOutbox(payload, transport);
      assert.equal(delivered, 1);
      assert.equal((await payload.findByID({ collection: 'notifications', id: pending.docs[0].id, overrideAccess: true })).state, 'captured');
    });

    await t.test('les API anonymes et client ne lisent ni CRM ni notifications ; schéma public sans destinataires', async () => {
      await assert.rejects(() => payload.find({ collection: 'briefs', overrideAccess: false, user: null }));
      await assert.rejects(() => payload.find({ collection: 'notifications', overrideAccess: false, user: null }));
      await assert.rejects(() => payload.find({ collection: 'briefs', overrideAccess: false, user: { id: 912, collection: 'users', role: 'client' } }));
      const forms = await payload.find({ collection: 'forms', overrideAccess: false, user: null });
      assert.equal(forms.docs[0].notification, undefined);
      assert.equal('notification' in (await getPublishedForm(payload))!, false);
    });

    await t.test('historique des transitions et refus de modification des réponses', async () => {
      const brief = (await payload.find({ collection: 'briefs', depth: 0, overrideAccess: true })).docs[0];
      const status = (await payload.find({ collection: 'crm-statuses', where: { key: { equals: 'qualified' } }, overrideAccess: true })).docs[0];
      const changed = await payload.update({ collection: 'briefs', id: brief.id, data: { status: status.id, nextAction: 'Préparer le retour', notes: [{ text: 'Note de recette' }] }, overrideAccess: true });
      assert.equal((changed.history as unknown[]).length, 2);
      await assert.rejects(() => payload.update({ collection: 'briefs', id: brief.id, data: { answers: { forged: 'injection' } }, overrideAccess: true }), /immuables/);
    });

    await t.test('limite durable et validation avant confirmation', async () => {
      for (let index = 0; index < 3; index += 1) await submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: 'limited-source' });
      await assert.rejects(() => submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: 'limited-source' }), (error: unknown) => error instanceof SubmissionError && error.status === 429);
      await assert.rejects(() => submitBrief(payload, { body: { answers: { ...body.answers, email: 'incorrect' } }, idempotencyKey: randomUUID(), rateKey: 'bad-form' }), (error: unknown) => error instanceof SubmissionError && error.status === 422);
    });

    await t.test('une demande à la corbeille annule ses notifications encore en attente', async () => {
      const pending = await payload.find({ collection: 'notifications', where: { state: { equals: 'pending' } }, depth: 0, overrideAccess: true });
      assert.ok(pending.docs[0]);
      await payload.update({ collection: 'briefs', id: pending.docs[0].brief as number, data: { deletedAt: new Date().toISOString() }, overrideAccess: true });
      await processNotificationOutbox(payload, { send: async () => ({ providerId: 'local-test', captured: true }) });
      const notification = await payload.findByID({ collection: 'notifications', id: pending.docs[0].id, overrideAccess: true });
      assert.equal(notification.state, 'cancelled');
    });

    await t.test('un échec de stockage outbox annule toute la transaction de réception', async () => {
      const before = await payload.count({ collection: 'briefs', overrideAccess: true });
      const eventsBefore = await payload.count({ collection: 'analytics-events', overrideAccess: true });
      rejectOutbox = true;
      try { await assert.rejects(() => submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: 'rollback-source' }), /Échec de stockage/); }
      finally { rejectOutbox = false; }
      assert.equal((await payload.count({ collection: 'briefs', overrideAccess: true })).totalDocs, before.totalDocs);
      assert.equal((await payload.count({ collection: 'analytics-events', overrideAccess: true })).totalDocs, eventsBefore.totalDocs);
    });

    await t.test('pilotage commercial : droits, conflit concurrent, rappels terminés et export protégé', async () => {
      const person = await payload.create({ collection: 'users', data: { name: 'Équipe de recette', email: 'equipe@example.invalid', password: randomBytes(32).toString('hex'), role: 'sales' }, overrideAccess: true });
      const user = { ...person, collection: 'users' as const };
      const snapshot = await getOperationsSnapshot(payload, user, new URLSearchParams());
      assert.ok(snapshot.totalBriefs > 0);
      const brief = snapshot.briefs[0];
      await mutateOperation(payload, user, { action: 'brief', id: brief.id, expectedUpdatedAt: brief.updatedAt, nextAction: 'Action issue du pilotage', assignee: String(person.id), note: 'Note ajoutée depuis le pilotage' });
      await assert.rejects(() => mutateOperation(payload, user, { action: 'brief', id: brief.id, expectedUpdatedAt: brief.updatedAt, nextAction: 'Écrasement interdit' }), (error: unknown) => error instanceof SubmissionError && error.status === 409);
      const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 86400000));
      await mutateOperation(payload, user, { action: 'createTask', title: 'Rappel de recette', kind: 'showreel', assignee: String(person.id), dueLocal: `${yesterday}T10:00` });
      const withTask = await getOperationsSnapshot(payload, user, new URLSearchParams());
      assert.equal(withTask.stats.overdue, 1);
      const task = withTask.tasks[0];
      await mutateOperation(payload, user, { action: 'taskState', id: task.id, expectedUpdatedAt: task.updatedAt, state: 'done' });
      assert.equal((await getOperationsSnapshot(payload, user, new URLSearchParams())).stats.overdue, 0);
      const csv = await operationsCSV(payload, user, new URLSearchParams());
      assert.ok(csv.startsWith('\ufeff'));
      assert.ok(csv.includes('Échéance UTC'));
      assert.match(csvCell('  =HYPERLINK("https://invalid")'), /^"'/);
      await assert.rejects(() => operationsCSV(payload, { ...user, role: 'client' }, new URLSearchParams()), (error: unknown) => error instanceof SubmissionError && error.status === 403);
      await assert.rejects(() => getOperationsSnapshot(payload, null, new URLSearchParams()), (error: unknown) => error instanceof SubmissionError && error.status === 401);
    });

    await t.test('un rappel lié accepte l’identifiant de demande transmis par le formulaire', async () => {
      const person = (await payload.find({ collection: 'users', where: { role: { equals: 'sales' } }, limit: 1 })).docs[0];
      const user = { ...person, collection: 'users' as const };
      const brief = (await payload.find({ collection: 'briefs', depth: 0, user, overrideAccess: false, limit: 1 })).docs[0];
      await mutateOperation(payload, user, { action: 'createTask', title: 'Rappel lié de recette', kind: 'reminder', assignee: String(person.id), dueLocal: '2026-10-27T10:00', brief: String(brief.id), description: 'Suivre la demande liée', contentPath: '', notifyAssignee: false, notifyMinutesBefore: 0 });
      const task = (await payload.find({ collection: 'tasks', where: { title: { equals: 'Rappel lié de recette' } }, depth: 0, user, overrideAccess: false })).docs[0];
      assert.equal(task.brief, brief.id);
      assert.equal(task.assignee, person.id);
      assert.equal(task.dueAt, '2026-10-27T09:00:00.000Z');
      assert.equal(task.notifyAssignee, false);
      assert.equal(task.notifyAt, null);
    });

    await t.test('mesure : activation, consentement, absence de PII et déduplication', async () => {
      const previous = process.env.CMS_BROWSER_ANALYTICS;
      try {
        delete process.env.CMS_BROWSER_ANALYTICS;
        assert.equal(await recordBrowserEvent(payload, {}), false);
        process.env.CMS_BROWSER_ANALYTICS = 'enabled';
        const publicForm = await payload.find({ collection: 'forms', where: { slug: { equals: 'brief-projet' } }, limit: 1 });
        const event = { event: 'form_start', eventId: randomUUID(), consent: true, pageKey: `form-${publicForm.docs[0].id}`, device: 'desktop' };
        await assert.rejects(() => recordBrowserEvent(payload, { ...event, email: 'interdit@example.invalid' }), /personnelles/);
        await assert.rejects(() => recordBrowserEvent(payload, { ...event, consent: false }), /invalide/);
        await recordBrowserEvent(payload, event, 'test-event');
        await recordBrowserEvent(payload, event, 'test-event');
        assert.equal((await payload.count({ collection: 'analytics-events', where: { event: { equals: 'form_start' } }, overrideAccess: true })).totalDocs, 1);
      } finally { if (previous === undefined) delete process.env.CMS_BROWSER_ANALYTICS; else process.env.CMS_BROWSER_ANALYTICS = previous; }
    });

    await t.test('horaires Europe/Paris : conversions et changements d’heure contrôlés', () => {
      assert.equal(parisLocalToUTC('2026-07-10T10:30'), '2026-07-10T08:30:00.000Z');
      assert.equal(parisLocalToUTC('2026-12-10T10:30'), '2026-12-10T09:30:00.000Z');
      assert.throws(() => parisLocalToUTC('2026-03-29T02:30'), /n’existe pas/);
      assert.throws(() => parisLocalToUTC('2026-10-25T02:30'), /ambiguë/);
    });

    await t.test('après résultat email incertain et expiration fournisseur, ni worker redémarré ni bouton de reprise ne renvoient', async () => {
      const person = (await payload.find({ collection: 'users', where: { role: { equals: 'sales' } }, limit: 1 })).docs[0];
      const initial = await submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: 'expired-notification-' + randomUUID() });
      assert.equal(initial.duplicate, false);
      const pending = (await payload.find({ collection: 'notifications', where: { state: { equals: 'pending' } }, limit: 1 })).docs[0];
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await payload.update({ collection: 'notifications', id: pending.id, data: { state: 'processing', attempts: 1, firstAttemptAt: yesterday, leaseUntil: yesterday } });
      let delivered = 0;
      const transport = { send: async () => { delivered += 1; return { providerId: 'should-not-send' }; } };
      await processNotificationOutbox(payload, transport);
      await processNotificationOutbox(payload, transport);
      assert.equal(delivered, 0);
      const blocked = await payload.findByID({ collection: 'notifications', id: pending.id });
      assert.equal(blocked.state, 'failed'); assert.match(String(blocked.error), /Vérifiez dans Resend/);
      await assert.rejects(() => mutateOperation(payload, { ...person, collection: 'users' }, { action: 'retryNotification', id: blocked.id, expectedUpdatedAt: blocked.updatedAt }), /fenêtre de déduplication/);
      await assert.rejects(() => payload.update({ collection: 'notifications', id: blocked.id, user: { ...person, collection: 'users' }, overrideAccess: false, data: { retryNow: true, firstAttemptAt: new Date().toISOString(), attempts: 0 } }), /fenêtre de déduplication/);
      assert.equal(notificationRetryExpired({ createdAt: yesterday, attempts: 1 }), true, 'Ancienne ligne sans date de première tentative : limite conservatrice depuis création');
      assert.equal(notificationRetryExpired({ createdAt: yesterday, attempts: 0, state: 'pending' }), false, 'Une première tentative peut être tardive');
    });

    await t.test('deux workers concurrents ne traitent pas la même notification', async () => {
      await submitBrief(payload, { body, idempotencyKey: randomUUID(), rateKey: 'concurrent-worker-test' });
      const delivered = new Map<string, number>();
      const transport = { send: async (message: { dedupeKey: string }) => {
        delivered.set(message.dedupeKey, (delivered.get(message.dedupeKey) || 0) + 1);
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { providerId: 'concurrent-local-capture', captured: true };
      } };
      await Promise.all([processNotificationOutbox(payload, transport), processNotificationOutbox(payload, transport)]);
      assert.equal(delivered.size, 1);
      assert.equal([...delivered.values()].every((count) => count === 1), true);
    });
  } finally { await payload.destroy(); }
});
