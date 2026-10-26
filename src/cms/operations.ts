import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { Payload, PayloadRequest, Where } from 'payload';
import { hasRole } from './access';
import { initialBriefForm, isRecord, validateFormAnswers, type PublicForm } from './form-schema';
import { browserEvents, acquisitionCategories } from './analytics-events';
import { analyticsContentExists } from './analytics-server';
import { validateBriefFiles } from './brief-files';
import { notificationReconciliationMessage, notificationRetryExpired } from './notification-policy';
import { reminderStillValid, scheduledPublications, type ScheduledPublication } from './calendar';
import { getAudienceBreakdown, type AudienceBreakdown } from './audience-breakdown';
import { applyFormTranslation, type FormTranslations } from './form-translations';
import { formSourceRevision } from './form-translation-server';

type CMSDocument = Record<string, unknown> & { id: string | number };
type FormDocument = PublicForm & { updatedAt: string; translations?: FormTranslations; notification?: {
  enabled?: boolean; recipients?: { email: string }[]; subject?: string;
  acknowledgementEnabled?: boolean; acknowledgementSubject?: string; acknowledgementBody?: string;
} };

export class SubmissionError extends Error {
  constructor(message: string, readonly status: number, readonly fields?: Record<string, string>) { super(message); }
}

function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }

/** Persist only a keyed daily digest for abuse protection; no raw address is stored or logged. */
export function abuseKey(address: string, secret: string): string {
  return createHmac('sha256', secret).update(`${new Date().toISOString().slice(0, 10)}:${address}`).digest('hex');
}

function publicSchema(doc: FormDocument, locale: 'fr' | 'en' = 'fr'): PublicForm {
  const source = {
    id: doc.id, slug: doc.slug, title: doc.title, revision: doc.updatedAt || doc.revision,
    steps: doc.steps.map(({ key, label, title, description }) => ({ key, label, title, description })),
    fields: doc.fields.map(({ key, label, type, step, required, placeholder, help, minLength, maxLength, options, conditionField, conditionValues }) => ({ key, label, type, step, required, placeholder, help, minLength, maxLength, options, conditionField, conditionValues })),
    texts: doc.texts,
  };
  return applyFormTranslation(source, doc.translations, locale, formSourceRevision(doc as unknown as Record<string, unknown>));
}

async function findPublishedForm(payload: Payload, slug: string): Promise<FormDocument | null> {
  const result = await payload.find({ collection: 'forms', where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] }, draft: false, depth: 0, limit: 1, overrideAccess: true });
  return (result.docs[0] as unknown as FormDocument | undefined) ?? null;
}

export async function getPublishedForm(payload: Payload, slug = 'brief-projet', locale: 'fr' | 'en' = 'fr'): Promise<PublicForm | null> {
  const doc = await findPublishedForm(payload, slug);
  return doc ? publicSchema(doc, locale) : null;
}

/** Three durable slots/minute. The unique index, rather than process memory, enforces the limit. */
export async function acquireSubmissionSlot(payload: Payload, key: string, now: Date, maximum = 3): Promise<boolean> {
  const window = Math.floor(now.getTime() / 60_000);
  for (let slot = 0; slot < maximum; slot += 1) {
    const token = `${key}:${window}:${slot}`;
    const exists = await payload.find({ collection: 'submission-limits', where: { key: { equals: token } }, limit: 1, depth: 0, overrideAccess: true });
    if (exists.totalDocs) continue;
    try {
      await payload.create({ collection: 'submission-limits', data: { key: token, expiresAt: new Date(now.getTime() + 120_000).toISOString() }, overrideAccess: true });
      return true;
    } catch (error) {
      const claimed = await payload.find({ collection: 'submission-limits', where: { key: { equals: token } }, limit: 1, depth: 0, overrideAccess: true });
      if (!claimed.totalDocs) throw error;
    }
  }
  return false;
}

function sameSubmission(existing: CMSDocument, hash: string): void {
  if (existing.submissionHash !== hash) throw new SubmissionError('Cette clé de réception a déjà été utilisée pour une autre demande. Rechargez le formulaire avant une nouvelle demande.', 409);
}

export async function submitBrief(payload: Payload, input: {
  body: unknown; idempotencyKey: string; rateKey: string;
}): Promise<{ ok: true; duplicate: boolean; confirmation: string }> {
  if (!isRecord(input.body)) throw new SubmissionError('Données de formulaire invalides.', 400);
  const body = input.body;
  if (typeof body.website === 'string' && body.website) throw new SubmissionError('La demande a été rejetée par la protection anti-spam.', 400);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey)) throw new SubmissionError('Clé de réception manquante ou invalide. Rechargez le formulaire.', 400);
  const slug = typeof body.formSlug === 'string' ? body.formSlug : 'brief-projet';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new SubmissionError('Formulaire invalide.', 400);
  const key = digest(`${slug}:${input.idempotencyKey}`);
  const previous = await payload.find({ collection: 'briefs', where: { submissionKey: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true });
  if (previous.docs[0]) {
    // A lost response can be retried after the public form changes or is archived.
    // Validate that retry against the immutable schema actually received.
    const received = previous.docs[0] as CMSDocument;
    const snapshot = received.schemaSnapshot as unknown as PublicForm;
    const retry = validateFormAnswers(snapshot, body.answers ?? body);
    if (Object.keys(retry.errors).length) throw new SubmissionError(snapshot.texts.invalidError, 422, retry.errors);
    sameSubmission(received, digest(JSON.stringify({ slug, answers: retry.answers })));
    return { ok: true, duplicate: true, confirmation: snapshot.texts.successTitle };
  }
  const doc = await findPublishedForm(payload, slug);
  if (!doc) throw new SubmissionError('Le formulaire est momentanément indisponible.', 503);
  const form = publicSchema(doc, body.locale === 'en' ? 'en' : 'fr');
  const { answers, errors } = validateFormAnswers(form, body.answers ?? body);
  if (Object.keys(errors).length) throw new SubmissionError(form.texts.invalidError, 422, errors);
  // A new submission uses the current published schema, never a supplied schema.
  const hash = digest(JSON.stringify({ slug, answers }));
  await validateBriefFiles(form, answers, input.idempotencyKey);
  if (!await acquireSubmissionSlot(payload, input.rateKey, new Date())) throw new SubmissionError(form.texts.rateLimitError, 429);
  const initialStatus = await payload.find({ collection: 'crm-statuses', where: { key: { equals: 'received' } }, depth: 0, limit: 1, overrideAccess: true });
  if (!initialStatus.docs[0]) throw new SubmissionError(form.texts.unavailableError, 503);
  const transactionID = await payload.db.beginTransaction();
  if (transactionID === null) throw new SubmissionError('Le stockage transactionnel est indisponible.', 503);
  const req = { transactionID };
  try {
    const now = new Date().toISOString();
    const brief = await payload.create({
      collection: 'briefs', req, overrideAccess: true,
      data: {
        submissionKey: key, submissionHash: hash, form: form.id, formRevision: form.revision,
        name: typeof answers.name === 'string' ? answers.name : form.title,
        email: typeof answers.email === 'string' ? answers.email : undefined,
        universe: typeof answers.universe === 'string' ? answers.universe : undefined,
        status: initialStatus.docs[0].id, schemaSnapshot: form, answers,
        history: [{ at: now, actor: 'visiteur', action: 'réception' }],
      },
    });
    const message = form.fields.filter((field) => field.key in answers).map((field) => `${field.label}\n${field.type === 'file' ? (answers[field.key] ? 'Pièce jointe privée disponible dans le CRM.' : 'Aucune pièce jointe.') : String(answers[field.key])}`).join('\n\n');
    if (doc.notification?.enabled !== false) {
      await payload.create({ collection: 'notifications', req, overrideAccess: true, data: {
        dedupeKey: `brief:${brief.id}:internal`, brief: brief.id, kind: 'internal',
        subject: doc.notification?.subject || '[MIS] Nouveau brief reçu',
        recipients: doc.notification?.recipients?.map(({ email }) => email) ?? [],
        body: message, state: 'pending', attempts: 0, nextAttemptAt: now,
      } });
    }
    if (doc.notification?.acknowledgementEnabled && typeof answers.email === 'string' && answers.email) {
      await payload.create({ collection: 'notifications', req, overrideAccess: true, data: {
        dedupeKey: `brief:${brief.id}:ack`, brief: brief.id, kind: 'acknowledgement',
        subject: doc.notification.acknowledgementSubject || 'Votre demande MIS a été reçue',
        recipients: [answers.email], body: doc.notification.acknowledgementBody || form.texts.successDescription,
        state: 'pending', attempts: 0, nextAttemptAt: now,
      } });
    }
    await payload.create({ collection: 'analytics-events', req, overrideAccess: true, data: {
      dedupeKey: randomUUID(), event: 'brief_received', day: now.slice(0, 10), pageKey: `form-${doc.id}`, source: 'server-confirmed',
    } });
    await payload.db.commitTransaction(transactionID);
    return { ok: true, duplicate: false, confirmation: form.texts.successTitle };
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    // Concurrent retries may reach the unique key together. Return success only if the same payload committed.
    const concurrent = await payload.find({ collection: 'briefs', where: { submissionKey: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true });
    if (concurrent.docs[0]) {
      sameSubmission(concurrent.docs[0] as CMSDocument, hash);
      return { ok: true, duplicate: true, confirmation: form.texts.successTitle };
    }
    throw error;
  }
}

export async function seedOperations(payload: Payload): Promise<void> {
  const statuses = [
    { key: 'received', title: 'Reçue', category: 'received' }, { key: 'qualified', title: 'Qualifiée', category: 'qualified' },
    { key: 'quoted', title: 'Devis en cours', category: 'open' }, { key: 'won', title: 'Gagnée', category: 'won' }, { key: 'lost', title: 'Perdue', category: 'lost' },
  ];
  for (const [order, status] of statuses.entries()) {
    const existing = await payload.find({ collection: 'crm-statuses', where: { key: { equals: status.key } }, limit: 1, overrideAccess: true });
    if (!existing.totalDocs) await payload.create({ collection: 'crm-statuses', data: { ...status, order }, overrideAccess: true });
  }
  const existing = await payload.find({ collection: 'forms', where: { slug: { equals: initialBriefForm.slug } }, limit: 1, overrideAccess: true });
  if (!existing.totalDocs) await payload.create({ collection: 'forms', data: {
    ...initialBriefForm, _status: 'published', notification: { enabled: true, recipients: [{ email: 'contact@mis-prod.fr' }], subject: '[MIS] Nouveau brief reçu', acknowledgementEnabled: false },
  }, overrideAccess: true });
}

type Mail = { id: string | number; dedupeKey: string; subject: string; body: string; recipients: string[]; brief?: number | string; task?: number | string; kind?: string; attempts: number; createdAt?: string; firstAttemptAt?: string; claimToken?: string; state: string };

export interface MailTransport { send(message: Readonly<Mail>): Promise<{ providerId: string; captured?: boolean }> }

async function retryBusy<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= 4 || !(error instanceof Error) || !/SQLITE_BUSY|database is locked/.test(error.message)) throw error;
      // Let the current transaction finish before retrying the whole atomic operation.
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

/** Test capture is the default. Real delivery requires an explicit deployment authorization flag. */
export function configuredMailTransport(): MailTransport {
  if (process.env.CMS_EMAIL_DELIVERY !== 'enabled') return { send: async () => ({ providerId: 'local-test-capture', captured: true }) };
  return { send: async (message) => {
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_SENDER) throw new Error('Configuration manquante : RESEND_API_KEY et CONTACT_SENDER.');
    if (!message.recipients.length) throw new Error('Aucun destinataire configuré dans le formulaire.');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': message.dedupeKey },
      body: JSON.stringify({ from: process.env.CONTACT_SENDER, to: message.recipients, subject: message.subject, text: message.body }),
    });
    if (!response.ok) throw new Error(`Le fournisseur email a répondu HTTP ${response.status}.`);
    const result: unknown = await response.json();
    if (!isRecord(result) || typeof result.id !== 'string') throw new Error('Réponse du fournisseur email invalide.');
    return { providerId: result.id };
  } };
}

/** Durable leases plus provider idempotency. No unbounded retry after the provider's 24-hour key retention. */
export async function processNotificationOutbox(payload: Payload, transport = configuredMailTransport()): Promise<{ processed: number; failed: number }> {
  const now = new Date();
  const eligible: Where = { or: [
    { and: [{ state: { equals: 'pending' } }, { nextAttemptAt: { less_than_equal: now.toISOString() } }] },
    { and: [{ state: { equals: 'processing' } }, { leaseUntil: { less_than_equal: now.toISOString() } }] },
  ] };
  const pending = await payload.find({ collection: 'notifications', where: eligible, limit: 25, depth: 0, sort: 'createdAt', overrideAccess: true });
  let processed = 0; let failed = 0;
  for (const raw of pending.docs) {
    const mail = raw as unknown as Mail;
    if (notificationRetryExpired(mail, now)) {
      await retryBusy(() => payload.update({ collection: 'notifications', where: { and: [{ id: { equals: mail.id } }, eligible] }, data: { state: 'failed', error: notificationReconciliationMessage, leaseUntil: null }, overrideAccess: true }));
      failed += 1; continue;
    }
    const token = randomUUID();
    const claimed = await retryBusy(() => payload.update({ collection: 'notifications', where: { and: [{ id: { equals: mail.id } }, eligible] }, data: {
      state: 'processing', claimToken: token, leaseUntil: new Date(now.getTime() + 60_000).toISOString(),
      firstAttemptAt: mail.firstAttemptAt || now.toISOString(), attempts: (mail.attempts || 0) + 1,
    }, overrideAccess: true }));
    if (!claimed.docs.length) continue;
    const fresh = await payload.findByID({ collection: 'notifications', id: mail.id, depth: 0, overrideAccess: true });
    if (fresh.claimToken !== token) continue;
    const sourceValid = mail.kind === 'reminder' ? await reminderStillValid(payload, mail.task, mail.dedupeKey) : Boolean(mail.brief && (await payload.find({ collection: 'briefs', where: { id: { equals: mail.brief } }, limit: 1, overrideAccess: true })).totalDocs);
    if (!sourceValid) {
      await retryBusy(() => payload.update({ collection: 'notifications', id: mail.id, data: { state: 'cancelled', error: 'La demande ou tâche a été supprimée, terminée, réattribuée ou reprogrammée.', leaseUntil: null }, overrideAccess: true }));
      continue;
    }
    try {
      if (notificationRetryExpired(mail, new Date())) throw new Error(notificationReconciliationMessage);
      const result = await transport.send(mail);
      await retryBusy(() => payload.update({ collection: 'notifications', id: mail.id, data: {
        state: result.captured ? 'captured' : 'sent', deliveredAt: new Date().toISOString(), providerId: result.providerId, leaseUntil: null, error: null,
      }, overrideAccess: true }));
      processed += 1;
    } catch (error) {
      const attempt = (mail.attempts || 0) + 1;
      await retryBusy(() => payload.update({ collection: 'notifications', id: mail.id, data: {
        state: attempt >= 3 || notificationRetryExpired(mail, new Date()) ? 'failed' : 'pending',
        error: error instanceof Error ? error.message.slice(0, 400) : 'Échec de notification.', leaseUntil: null,
        nextAttemptAt: new Date(now.getTime() + 60_000 * 2 ** attempt).toISOString(),
      }, overrideAccess: true }));
      failed += 1;
    }
  }
  await retryBusy(() => payload.delete({ collection: 'submission-limits', where: { expiresAt: { less_than: now.toISOString() } }, overrideAccess: true }));
  return { processed, failed };
}

export { browserEvents } from './analytics-events';

export async function recordBrowserEvent(payload: Payload, body: unknown, rateKey = 'global'): Promise<boolean> {
  if (process.env.CMS_BROWSER_ANALYTICS !== 'enabled') return false;
  if (!isRecord(body) || body.consent !== true || typeof body.event !== 'string' || !browserEvents.includes(body.event as typeof browserEvents[number])) throw new SubmissionError('Événement invalide.', 400);
  if (typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.eventId)) throw new SubmissionError('Identifiant d’événement invalide.', 400);
  const allowedKeys = new Set(['event', 'eventId', 'consent', 'pageKey', 'step', 'device','entry','acquisition']);
  if(('entry'in body||'acquisition'in body)&&(body.event!=='page_view'||typeof body.entry!=='boolean'||!acquisitionCategories.includes(body.acquisition as typeof acquisitionCategories[number])))throw new SubmissionError('Source et entrée invalides.',400);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new SubmissionError('Les données personnelles et champs supplémentaires sont interdits dans la mesure.', 400);
  let pageKey: string | undefined;
  if (body.pageKey !== undefined) {
    if (typeof body.pageKey !== 'string' || !await analyticsContentExists(payload, body.pageKey)) throw new SubmissionError('Référence de contenu publié invalide.', 400);
    pageKey = body.pageKey;
  }
  if (body.step !== undefined && (!Number.isInteger(body.step) || Number(body.step) < 0 || Number(body.step) > 100)) throw new SubmissionError('Progression invalide.', 400);
  const dedupeKey = digest(`event:${body.event}:${body.eventId}`);
  const existing = await payload.find({ collection: 'analytics-events', where: { dedupeKey: { equals: dedupeKey } }, limit: 1, overrideAccess: true });
  if (existing.totalDocs) return true;
  if (!await acquireSubmissionSlot(payload, `analytics:${rateKey}`, new Date(), 60)) throw new SubmissionError('Limite de mesure atteinte.', 429);
  await payload.create({ collection: 'analytics-events', overrideAccess: true, data: {
    dedupeKey, event: body.event, day: new Date().toISOString().slice(0, 10), pageKey,
    step: body.step, device: ['mobile', 'tablet', 'desktop'].includes(String(body.device)) ? body.device : 'unknown', source: 'consented-browser',entry:body.entry,acquisition:body.acquisition,
  } });
  return true;
}

export async function readLimitedJSON(request: Request, maximum = 64_000): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new SubmissionError('Format JSON requis.', 415);
  if (!request.body || Number(request.headers.get('content-length') ?? 0) > maximum) throw new SubmissionError('Requête absente ou trop volumineuse.', 413);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0; let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) { await reader.cancel(); throw new SubmissionError('Requête trop volumineuse.', 413); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    try { return JSON.parse(text); } catch { throw new SubmissionError('Données JSON invalides.', 400); }
  } finally { reader.releaseLock(); }
}

type OperationsUser = PayloadRequest['user'];
function requireSales(user: OperationsUser): void {
  if (!hasRole(user, ['owner', 'admin', 'sales'])) throw new SubmissionError('Accès commercial requis.', user ? 403 : 401);
}
function idOf(value: unknown): string { return String(isRecord(value) ? value.id ?? '' : value ?? ''); }
function stringOf(value: unknown): string { return typeof value === 'string' ? value : ''; }

export interface OperationsBrief {
  id: string; name: string; email: string; universe: string; status: string; assignee: string;
  nextAction: string; dueAt: string; budgetCents: number | null; createdAt: string; updatedAt: string;
  message: string; notes: { text: string }[]; attachments: { label: string; href: string }[];
}
export interface OperationsTask {
  id: string; title: string; description: string; dueAt: string; state: string; kind: string;
  assignee: string; brief: string; contentPath: string; updatedAt: string; notifyAssignee: boolean; notifyMinutesBefore: number;
}
export interface OperationsSnapshot {
  publications: { available: boolean; items: ScheduledPublication[]; total: number }; audience: AudienceBreakdown;
  observedAt: string; userId: string; from: string; to: string; month: string; query: string; statusFilter: string;
  page: number; totalPages: number; totalBriefs: number; briefs: OperationsBrief[];
  statuses: { id: string; title: string; category: string; allowedNext: string[] }[];
  team: { id: string; name: string; role: string }[]; tasks: OperationsTask[]; taskTotal: number;
  notifications: { id: string; subject: string; state: string; error: string; nextAttemptAt: string; updatedAt: string }[];
  stats: { received: number; qualified: number; won: number; overdue: number; events: { event: string; count: number }[]; browserEnabled: boolean };
}

function queryOptions(params: URLSearchParams) {
  const now = new Date();
  const to = params.get('to') || now.toISOString().slice(0, 10);
  const from = params.get('from') || new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const month = params.get('month') || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86_400_000) throw new SubmissionError('Choisissez une période valide de 367 jours maximum.', 400);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new SubmissionError('Mois invalide.', 400);
  const query = (params.get('q') || '').slice(0, 100).trim();
  const status = (params.get('status') || '').slice(0, 100);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') || '1', 10) || 1));
  const filters: Where[] = [];
  if (query) filters.push({ or: [{ name: { contains: query } }, { email: { contains: query } }, { universe: { contains: query } }] });
  if (status) filters.push({ status: { equals: status } });
  const where: Where = filters.length ? { and: filters } : {};
  return { from, to, month, query, status, page, where };
}

export async function getOperationsSnapshot(payload: Payload, user: OperationsUser, params: URLSearchParams): Promise<OperationsSnapshot> {
  requireSales(user);
  const options = queryOptions(params);
  const access = { user, overrideAccess: false, depth: 0 } as const;
  const period: Where = { and: [{ createdAt: { greater_than_equal: `${options.from}T00:00:00.000Z` } }, { createdAt: { less_than_equal: `${options.to}T23:59:59.999Z` } }] };
  const eventsPeriod: Where = { and: [{ day: { greater_than_equal: options.from } }, { day: { less_than_equal: options.to } }] };
  const nextMonth = new Date(Date.UTC(Number(options.month.slice(0, 4)), Number(options.month.slice(5)), 1)).toISOString().slice(0, 7);
  const monthStart = parisLocalToUTC(`${options.month}-01T00:00`);
  const monthEnd = parisLocalToUTC(`${nextMonth}-01T00:00`);
  const now = new Date().toISOString();
  const [briefs, statuses, team, tasks, notifications, received, qualified, won, overdue, eventCounts, publications, audience] = await Promise.all([
    payload.find({ collection: 'briefs', where: options.where, sort: '-createdAt', limit: 100, page: options.page, ...access }),
    payload.find({ collection: 'crm-statuses', sort: 'order', limit: 100, ...access }),
    // A commercial may assign an internal colleague, but sees only this minimal directory, never credentials or personal account settings.
    payload.find({ collection: 'users', where: { role: { in: ['owner', 'admin', 'sales'] } }, limit: 100, depth: 0, overrideAccess: true, select: { name: true, role: true } }),
    payload.find({ collection: 'tasks', where: { and: [{ dueAt: { less_than: monthEnd } }, { or: [{ state: { equals: 'open' } }, { dueAt: { greater_than_equal: monthStart } }] }] }, sort: 'dueAt', limit: 250, ...access }),
    payload.find({ collection: 'notifications', where: { state: { in: ['failed', 'pending', 'processing'] } }, sort: '-createdAt', limit: 25, ...access }),
    payload.count({ collection: 'briefs', where: period, ...access }),
    payload.count({ collection: 'briefs', where: { and: [period, { 'status.category': { equals: 'qualified' } }] }, ...access }),
    payload.count({ collection: 'briefs', where: { and: [period, { 'status.category': { equals: 'won' } }] }, ...access }),
    payload.count({ collection: 'tasks', where: { and: [{ state: { equals: 'open' } }, { dueAt: { less_than: now } }] }, ...access }),
    Promise.all(['brief_received', ...browserEvents].map(async (event) => ({ event, count: (await payload.count({ collection: 'analytics-events', where: { and: [eventsPeriod, { event: { equals: event } }] }, ...access })).totalDocs }))),
    scheduledPublications(payload, user, monthStart, monthEnd),
    getAudienceBreakdown(payload, user, options.from, options.to),
  ]);
  return {
    publications, audience,
    observedAt: now, userId: String(user!.id), from: options.from, to: options.to, month: options.month, query: options.query, statusFilter: options.status,
    page: briefs.page || 1, totalPages: briefs.totalPages, totalBriefs: briefs.totalDocs,
    briefs: briefs.docs.map((item) => ({
      id: String(item.id), name: stringOf(item.name), email: stringOf(item.email), universe: stringOf(item.universe), status: idOf(item.status), assignee: idOf(item.assignee),
      nextAction: stringOf(item.nextAction), dueAt: stringOf(item.dueAt), budgetCents: typeof item.budgetCents === 'number' ? item.budgetCents : null,
      createdAt: stringOf(item.createdAt), updatedAt: stringOf(item.updatedAt), message: isRecord(item.answers) ? stringOf(item.answers.message) : '',
      notes: Array.isArray(item.notes) ? item.notes.map((note) => ({ text: isRecord(note) ? stringOf(note.text) : '' })) : [],
      attachments: isRecord(item.schemaSnapshot) && Array.isArray(item.schemaSnapshot.fields) ? item.schemaSnapshot.fields.filter(field => isRecord(field) && field.type === 'file' && isRecord(item.answers) && typeof item.answers[String(field.key)] === 'string' && /^bf_[a-f0-9]{64}$/.test(String(item.answers[String(field.key)]))).map(field => ({ label: String(field.label), href: `/api/brief-files/${item.id}/${encodeURIComponent(String(field.key))}` })) : [],
    })),
    statuses: statuses.docs.map((item) => ({ id: String(item.id), title: stringOf(item.title), category: stringOf(item.category), allowedNext: Array.isArray(item.allowedNext) ? item.allowedNext.map(idOf) : [] })),
    team: team.docs.map((item) => ({ id: String(item.id), name: stringOf(item.name) || `Compte ${item.id}`, role: stringOf(item.role) })),
    tasks: tasks.docs.map((item) => ({ id: String(item.id), title: stringOf(item.title), description: stringOf(item.description), dueAt: stringOf(item.dueAt), state: stringOf(item.state), kind: stringOf(item.kind), assignee: idOf(item.assignee), brief: idOf(item.brief), contentPath: stringOf(item.contentPath), updatedAt: stringOf(item.updatedAt), notifyAssignee: item.notifyAssignee === true, notifyMinutesBefore: Number(item.notifyMinutesBefore || 0) })), taskTotal: tasks.totalDocs,
    notifications: notifications.docs.map((item) => ({ id: String(item.id), subject: stringOf(item.subject), state: stringOf(item.state), error: stringOf(item.error), nextAttemptAt: stringOf(item.nextAttemptAt), updatedAt: stringOf(item.updatedAt) })),
    stats: { received: received.totalDocs, qualified: qualified.totalDocs, won: won.totalDocs, overdue: overdue.totalDocs, events: eventCounts, browserEnabled: process.env.CMS_BROWSER_ANALYTICS === 'enabled' },
  };
}

/** CSV cells cannot execute a spreadsheet formula, including after leading whitespace/control characters. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '').replaceAll('\u0000', '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function operationsCSV(payload: Payload, user: OperationsUser, params: URLSearchParams): Promise<string> {
  requireSales(user);
  const { where } = queryOptions(params);
  const access = { user, overrideAccess: false, depth: 1 } as const;
  const count = await payload.count({ collection: 'briefs', where, ...access });
  if (count.totalDocs > 5000) throw new SubmissionError('Plus de 5 000 demandes : affinez la recherche avant export.', 400);
  const records = await payload.find({ collection: 'briefs', where, limit: 5000, sort: '-createdAt', ...access });
  const rows: unknown[][] = [['Référence', 'Nom', 'Email', 'Univers', 'Statut', 'Responsable', 'Prochaine action', 'Échéance UTC', 'Budget EUR saisi', 'Réception UTC']];
  for (const record of records.docs) rows.push([record.id, record.name, record.email, record.universe, isRecord(record.status) ? record.status.title : record.status, isRecord(record.assignee) ? record.assignee.name : record.assignee, record.nextAction, record.dueAt, typeof record.budgetCents === 'number' ? (record.budgetCents / 100).toFixed(2) : '', record.createdAt]);
  return '\ufeff' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

/** Reject missing and ambiguous DST wall-clock times instead of silently shifting a reminder. */
export function parisLocalToUTC(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new SubmissionError('Date et heure requises au format Europe/Paris.', 400);
  const approximate = Date.parse(`${value}:00.000Z`);
  if (!Number.isFinite(approximate)) throw new SubmissionError('Date invalide.', 400);
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const matches: string[] = [];
  for (let offset = -180; offset <= 180; offset += 30) {
    const date = new Date(approximate + offset * 60_000);
    if (formatter.format(date).replace(' ', 'T') === value) matches.push(date.toISOString());
  }
  if (matches.length !== 1) throw new SubmissionError(matches.length ? 'Cette heure est ambiguë lors du changement d’heure. Choisissez une heure en dehors de la période répétée.' : 'Cette heure n’existe pas en Europe/Paris. Choisissez une autre heure.', 400);
  return matches[0];
}

export async function mutateOperation(payload: Payload, user: OperationsUser, input: unknown): Promise<void> {
  requireSales(user);
  if (!isRecord(input)) throw new SubmissionError('Action invalide.', 400);
  const action = stringOf(input.action);
  const access = { user, overrideAccess: false, depth: 0 } as const;
  if (action === 'createTask') {
    const title = stringOf(input.title).trim();
    if (!title || title.length > 200) throw new SubmissionError('Saisissez un objet de 1 à 200 caractères.', 400);
    const assignee = await validateAssignee(payload, stringOf(input.assignee) || String(user!.id));
    if (!['reminder', 'publication', 'showreel', 'price', 'rights', 'case-study'].includes(stringOf(input.kind))) throw new SubmissionError('Type de rappel invalide.', 400);
    if (input.brief) await payload.findByID({ collection: 'briefs', id: String(input.brief), ...access });
    await payload.create({ collection: 'tasks', data: { title, description: stringOf(input.description).slice(0, 4000), dueAt: parisLocalToUTC(stringOf(input.dueLocal)), assignee, kind: input.kind, state: 'open', brief: input.brief || undefined, contentPath: stringOf(input.contentPath), notifyAssignee: input.notifyAssignee === true || input.notifyAssignee === 'on', notifyMinutesBefore: Number(input.notifyMinutesBefore || 0) }, ...access });
    return;
  }
  const collection = action === 'brief' ? 'briefs' : action === 'taskState' ? 'tasks' : action === 'retryNotification' ? 'notifications' : null;
  if (!collection || !input.id || typeof input.expectedUpdatedAt !== 'string') throw new SubmissionError('Action ou version manquante.', 400);
  const transactionID = await payload.db.beginTransaction();
  if (transactionID === null) throw new SubmissionError('Le stockage transactionnel est indisponible.', 503);
  const req = { transactionID, user };
  try {
    const current = await payload.findByID({ collection, id: String(input.id), req, ...access });
    if (current.updatedAt !== input.expectedUpdatedAt) throw new SubmissionError('Cette fiche a changé. Actualisez avant de réessayer pour préserver les modifications de votre collègue.', 409);
    const data: Record<string, unknown> = {};
    if (action === 'brief') {
      if ('status' in input) {
        const status = await payload.findByID({ collection: 'crm-statuses', id: String(input.status), req, ...access });
        data.status = status.id;
      }
      if ('assignee' in input) {
        data.assignee = input.assignee ? await validateAssignee(payload, String(input.assignee), req) : null;
      }
      if ('nextAction' in input) data.nextAction = stringOf(input.nextAction).slice(0, 500);
      if ('dueLocal' in input) data.dueAt = input.dueLocal ? parisLocalToUTC(stringOf(input.dueLocal)) : null;
      if ('budgetCents' in input) {
        if (input.budgetCents !== null && (!Number.isSafeInteger(input.budgetCents) || Number(input.budgetCents) < 0 || Number(input.budgetCents) > 10000000000)) throw new SubmissionError('Budget invalide.', 400);
        data.budgetCents = input.budgetCents;
      }
      if (input.note) {
        const note = stringOf(input.note).trim();
        if (note.length > 4000) throw new SubmissionError('Note trop longue (4 000 caractères maximum).', 400);
        if (note) data.notes = [...(Array.isArray(current.notes) ? current.notes : []), { text: note }];
      }
    } else if (action === 'taskState') {
      if (!['open', 'done', 'cancelled'].includes(stringOf(input.state))) throw new SubmissionError('État de tâche invalide.', 400);
      data.state = input.state;
    } else data.retryNow = true;
    await payload.update({ collection, id: current.id, data, req, ...access, overrideLock: false });
    await payload.db.commitTransaction(transactionID);
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error; }
}

async function validateAssignee(payload: Payload, id: string, req?: Partial<PayloadRequest>): Promise<string | number> {
  const person = await payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req, select: { role: true } });
  if (!['owner', 'admin', 'sales'].includes(String(person.role))) throw new SubmissionError('Choisissez un responsable commercial autorisé.', 400);
  return person.id;
}
