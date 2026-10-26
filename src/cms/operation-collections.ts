import type { Access, CollectionConfig, FieldAccess, PayloadRequest, TextField, Where } from 'payload';
import { randomUUID } from 'node:crypto';
import { canEdit, canManage, canSell, isStaff } from './access';
import { isRecord, validateFormDefinition, type FormField, type FormStep } from './form-schema';
import { notificationReconciliationMessage, notificationRetryExpired } from './notification-policy';
import { translationState, validateFormTranslations } from './form-translations';
import { formSourceRevision, formTranslationGuard } from './form-translation-server';

const never: Access = () => false;
const salesAccess = { read: canSell, create: canSell, update: canSell, delete: canManage };
const internalRead: FieldAccess = ({ req }) => isStaff(req.user);
const privateField = { read: internalRead };
const immutable = { create: () => false, update: () => false };
const text = (name: string, label: string, required = false): TextField => ({ name, label, type: 'text', required });
const publicFormRead: Access = ({ req }) => isStaff(req.user) ? true : { _status: { equals: 'published' } };
const roleOf = (user: unknown) => isRecord(user) ? user.role : undefined;
const relationId = (value: unknown): unknown => isRecord(value) ? value.id : value;

export const Forms: CollectionConfig = {
  slug: 'forms', labels: { singular: 'Formulaire', plural: 'Formulaires' },
  admin: { useAsTitle: 'title', group: 'Site et contenus', defaultColumns: ['title', 'slug', '_status', 'updatedAt'], description: 'Les réponses conservent le schéma publié lors de leur réception. Les conditions portent sur un champ antérieur sans condition.' },
  access: { read: publicFormRead, create: canEdit, update: canEdit, delete: canManage, readVersions: canEdit },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  trash: true,
  hooks: { beforeChange: [formTranslationGuard, ({ data, originalDoc }) => {
    const merged = { ...originalDoc, ...data };
    if (merged._status === 'published') {
      const error = validateFormDefinition({ steps: (merged.steps ?? []) as FormStep[], fields: (merged.fields ?? []) as FormField[] });
      if (error) throw new Error(error);
    }
    return data;
  }], afterRead: [({ doc }) => { if (doc.translations?.en) doc.translations.en.state = translationState(doc.translations, formSourceRevision(doc)); return doc; }] },
  fields: [
    text('title', 'Nom du formulaire', true),
    { name: 'translations', label: 'Traductions et microtextes', type: 'json', access: { read: internalRead }, validate: validateFormTranslations, admin: { components: { Field: '/src/components/cms/form-translation-field#FormTranslationField' } } },
    { ...text('slug', 'Identifiant', true), unique: true, index: true },
    { name: 'steps', label: 'Étapes', type: 'array', minRows: 1, maxRows: 12, fields: [text('key', 'Clé (stable)', true), text('label', 'Libellé dans la progression'), text('title', 'Titre', true), { name: 'description', label: 'Introduction', type: 'textarea' }] },
    { name: 'fields', label: 'Questions', type: 'array', minRows: 1, maxRows: 80, admin: { initCollapsed: true }, fields: [
      text('key', 'Clé stable du champ', true), text('label', 'Libellé', true), text('step', 'Clé de l’étape', true),
      { name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'text', options: [
        { label: 'Texte court', value: 'text' }, { label: 'Texte long', value: 'textarea' }, { label: 'Email', value: 'email' }, { label: 'Téléphone', value: 'tel' },
        { label: 'Liste déroulante', value: 'select' }, { label: 'Choix en cartes', value: 'radio' }, { label: 'Case à cocher', value: 'checkbox' }, { label: 'Date', value: 'date' }, { label: 'Nombre', value: 'number' },
        { label: 'Pièce jointe privée (PDF ou image, 10 Mo)', value: 'file' },
      ] },
      { name: 'required', label: 'Obligatoire', type: 'checkbox' }, text('placeholder', 'Exemple de saisie'), text('help', 'Aide'),
      { type: 'row', fields: [{ name: 'minLength', label: 'Longueur minimale', type: 'number', min: 0, max: 5000 }, { name: 'maxLength', label: 'Longueur maximale', type: 'number', min: 1, max: 5000, defaultValue: 5000 }] },
      { name: 'options', label: 'Choix', type: 'array', fields: [text('value', 'Valeur', true), text('label', 'Libellé', true), text('description', 'Description')] },
      text('conditionField', 'Afficher si ce champ a une valeur parmi…'),
      { name: 'conditionValues', label: 'Valeurs qui rendent cette question visible', type: 'array', fields: [text('value', 'Valeur', true)] },
    ] },
    { name: 'texts', label: 'Boutons et messages', type: 'group', fields: [
      text('next', 'Continuer', true), text('back', 'Retour', true), text('submit', 'Envoyer', true), text('pending', 'Envoi en cours', true),
      text('successTitle', 'Titre de confirmation', true), { name: 'successDescription', label: 'Message de confirmation', type: 'textarea', required: true }, text('signature', 'Signature'),
      text('errorTitle', 'Titre d’erreur', true), text('networkError', 'Erreur réseau', true), text('invalidError', 'Erreur de validation', true), text('rateLimitError', 'Trop de tentatives', true), text('unavailableError', 'Indisponibilité', true), text('requiredError', 'Champ obligatoire', true),
      { name: 'privacy', label: 'Information confidentialité', type: 'textarea' }, text('honeypot', 'Libellé anti-spam', true),
    ] },
    { name: 'notification', label: 'Notifications', type: 'group', access: privateField, fields: [
      { name: 'enabled', label: 'Préparer une notification interne', type: 'checkbox', defaultValue: true },
      { name: 'recipients', label: 'Destinataires internes', type: 'array', fields: [{ name: 'email', label: 'Email', type: 'email', required: true }] },
      text('subject', 'Objet de la notification'),
      { name: 'acknowledgementEnabled', label: 'Préparer un accusé de réception au demandeur', type: 'checkbox', defaultValue: false },
      text('acknowledgementSubject', 'Objet de l’accusé de réception'),
      { name: 'acknowledgementBody', label: 'Texte de l’accusé de réception', type: 'textarea' },
    ] },
  ],
};

export const CRMStatuses: CollectionConfig = {
  slug: 'crm-statuses', labels: { singular: 'Statut commercial', plural: 'Statuts commerciaux' },
  admin: { useAsTitle: 'title', group: 'Demandes et clients' },
  access: { read: canSell, create: canManage, update: canManage, delete: canManage },
  hooks: { beforeDelete: [async ({ id, req }) => {
    const used = await req.payload.count({ collection: 'briefs', where: { status: { equals: id } }, req, overrideAccess: true });
    if (used.totalDocs) throw new Error('Ce statut est utilisé par des demandes. Réaffectez-les avant suppression.');
  }] },
  fields: [
    text('title', 'Libellé', true), { ...text('key', 'Clé stable', true), unique: true, index: true },
    { name: 'order', label: 'Ordre des colonnes', type: 'number', defaultValue: 0 },
    { name: 'category', label: 'Signification', type: 'select', required: true, defaultValue: 'open', options: [
      { label: 'Reçue / à traiter', value: 'received' }, { label: 'En cours', value: 'open' }, { label: 'Qualifiée', value: 'qualified' }, { label: 'Gagnée', value: 'won' }, { label: 'Perdue', value: 'lost' },
    ] },
    { name: 'allowedNext', label: 'Transitions autorisées (vide : toutes)', type: 'relationship', relationTo: 'crm-statuses', hasMany: true },
  ],
};

export const Briefs: CollectionConfig = {
  slug: 'briefs', labels: { singular: 'Demande', plural: 'Demandes' },
  admin: { useAsTitle: 'name', group: 'Demandes et clients', defaultColumns: ['name', 'universe', 'status', 'assignee', 'dueAt', 'createdAt'], description: 'Demandes réellement enregistrées. Les réponses et leur schéma sont conservés ensemble ; les statuts gagnés restent une saisie commerciale.' },
  access: { ...salesAccess, create: never },
  trash: true,
  hooks: {
    beforeDelete: [async ({ id, req }) => {
      // Purging a brief also purges its queued/captured messages, which contain the same personal data.
      await req.payload.delete({ collection: 'notifications', where: { brief: { equals: id } }, req, overrideAccess: true });
    }],
    beforeChange: [async ({ data, originalDoc, req, operation }) => {
      const old = originalDoc as Record<string, unknown> | undefined;
      const next = data as Record<string, unknown>;
      if (operation === 'update' && old) {
        for (const key of ['submissionKey', 'submissionHash', 'schemaSnapshot', 'answers', 'form', 'formRevision', 'name', 'email', 'universe', 'history']) {
          if (key in next && JSON.stringify(next[key]) !== JSON.stringify(old[key])) throw new Error('Les informations originales et l’historique d’une demande sont immuables.');
        }
        const statusChanged = 'status' in next && String(relationId(next.status)) !== String(relationId(old.status));
        if (statusChanged && old.status) {
          const previous = await req.payload.findByID({ collection: 'crm-statuses', id: relationId(old.status) as string | number, depth: 0, req, overrideAccess: true });
          const allowed = (previous.allowedNext ?? []) as (string | number)[];
          if (allowed.length && !allowed.map(String).includes(String(relationId(next.status))) && !['owner', 'admin'].includes(String(roleOf(req.user)))) throw new Error('Cette transition n’est pas autorisée par le statut courant.');
        }
        const changed = ['status', 'assignee', 'nextAction', 'dueAt', 'budgetCents', 'notes'].filter((key) => key in next && JSON.stringify(next[key]) !== JSON.stringify(old[key]));
        if (changed.length) next.history = [...(Array.isArray(old.history) ? old.history : []), {
          at: new Date().toISOString(), actor: req.user?.id ? String(req.user.id) : 'système',
          action: 'modification', fields: changed.join(', '), previousStatus: statusChanged ? String(relationId(old.status) ?? '') : undefined, nextStatus: statusChanged ? String(relationId(next.status) ?? '') : undefined,
        }];
      }
      return next;
    }],
  },
  fields: [
    { ...text('submissionKey', 'Clé de réception', true), unique: true, index: true, access: immutable, admin: { readOnly: true } },
    { ...text('submissionHash', 'Empreinte de soumission', true), access: { read: () => false, ...immutable }, admin: { hidden: true } },
    { ...text('name', 'Nom'), admin: { readOnly: true } }, { name: 'email', label: 'Email', type: 'email', admin: { readOnly: true } }, { ...text('universe', 'Univers'), admin: { readOnly: true } },
    { name: 'form', label: 'Formulaire', type: 'relationship', relationTo: 'forms', admin: { readOnly: true } }, { ...text('formRevision', 'Version reçue'), admin: { readOnly: true } },
    { name: 'status', label: 'Statut', type: 'relationship', relationTo: 'crm-statuses', required: true, index: true },
    { name: 'assignee', label: 'Responsable', type: 'relationship', relationTo: 'users', validate: async (value: unknown, { req }: { req: PayloadRequest }) => {
      if (!value) return true;
      try { const person = await req.payload.findByID({ collection: 'users', id: relationId(value) as string | number, req, depth: 0, overrideAccess: true }); return ['owner', 'admin', 'sales'].includes(String(person.role)) || 'Choisissez un responsable commercial autorisé.'; }
      catch { return 'Responsable introuvable.'; }
    } },
    { name: 'nextAction', label: 'Prochaine action', type: 'text' }, { name: 'dueAt', label: 'Échéance', type: 'date', index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'budgetCents', label: 'Budget saisi, en centimes EUR', type: 'number', min: 0, admin: { description: 'Montant renseigné manuellement ; aucun chiffre d’affaires déduit automatiquement.' } },
    { name: 'notes', label: 'Notes internes', type: 'array', fields: [{ name: 'text', label: 'Note', type: 'textarea', required: true }] },
    { name: 'answers', label: 'Réponses originales', type: 'json', required: true, admin: { readOnly: true } },
    { name: 'schemaSnapshot', label: 'Questions au moment de la réception', type: 'json', required: true, admin: { readOnly: true } },
    { name: 'history', label: 'Historique', type: 'json', admin: { readOnly: true } },
  ],
};

export const Notifications: CollectionConfig = {
  slug: 'notifications', labels: { singular: 'Notification', plural: 'Notifications' },
  admin: { useAsTitle: 'subject', group: 'Demandes et clients', defaultColumns: ['subject', 'state', 'attempts', 'nextAttemptAt'], description: 'Le mode test capture les emails dans cette file sans envoi externe. Un échec de notification ne supprime jamais la demande.' },
  access: { read: canSell, create: never, update: canSell, delete: canManage },
  hooks: { beforeChange: [({ data, originalDoc, req }) => {
    if (!req.user || !originalDoc) return data;
    if (!data.retryNow) throw new Error('Seule une demande de reprise est autorisée depuis l’administration.');
    if (!['failed', 'pending'].includes(String(originalDoc.state))) throw new Error('Cette notification n’est pas en échec.');
    if (notificationRetryExpired(originalDoc)) throw new Error(notificationReconciliationMessage);
    return { ...originalDoc, retryNow: false, state: 'pending', nextAttemptAt: new Date().toISOString(), error: null, attempts: 0 };
  }] },
  fields: [
    { ...text('dedupeKey', 'Clé de déduplication', true), unique: true, index: true, admin: { readOnly: true } },
    { name: 'brief', label: 'Demande', type: 'relationship', relationTo: 'briefs', admin: { readOnly: true } },
    { name: 'task', label: 'Rappel', type: 'relationship', relationTo: 'tasks', index: true, admin: { readOnly: true } },
    { name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'internal', label: 'Interne' }, { value: 'acknowledgement', label: 'Accusé de réception' }, { value: 'reminder', label: 'Rappel attribué' }], admin: { readOnly: true } },
    { ...text('subject', 'Objet', true), admin: { readOnly: true } },
    { name: 'recipients', label: 'Destinataires', type: 'json', required: true, admin: { readOnly: true } },
    { name: 'body', label: 'Message', type: 'textarea', required: true, admin: { readOnly: true } },
    { name: 'state', label: 'État', type: 'select', index: true, required: true, defaultValue: 'pending', options: [
      { value: 'pending', label: 'En attente' }, { value: 'processing', label: 'En traitement' }, { value: 'captured', label: 'Capturée en test (aucun envoi)' }, { value: 'sent', label: 'Envoyée' }, { value: 'failed', label: 'Échec' }, { value: 'cancelled', label: 'Annulée' },
    ], admin: { readOnly: true } },
    { name: 'attempts', label: 'Tentatives', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'nextAttemptAt', label: 'Prochaine tentative', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'leaseUntil', label: 'Fin du verrou de traitement', type: 'date', admin: { readOnly: true } },
    { ...text('claimToken', 'Verrou de traitement'), admin: { hidden: true } },
    { name: 'firstAttemptAt', label: 'Première tentative', type: 'date', admin: { readOnly: true } },
    { name: 'deliveredAt', label: 'Traitée le', type: 'date', admin: { readOnly: true } },
    { ...text('providerId', 'Identifiant fournisseur'), admin: { readOnly: true } },
    { name: 'error', label: 'Erreur exploitable', type: 'textarea', admin: { readOnly: true } },
    { name: 'retryNow', label: 'Demander une reprise au prochain passage du worker', type: 'checkbox', defaultValue: false },
  ],
};

export const Tasks: CollectionConfig = {
  slug: 'tasks', labels: { singular: 'Échéance', plural: 'Calendrier et rappels' },
  admin: { useAsTitle: 'title', group: 'Demandes et clients', defaultColumns: ['title', 'dueAt', 'assignee', 'state'], description: 'Les tâches terminées ne sont plus urgentes. La date est stockée en UTC, à afficher en Europe/Paris.' },
  access: salesAccess,
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const next = { ...originalDoc, ...data }
      const person = await req.payload.findByID({ collection: 'users', id: relationId(next.assignee) as string | number, depth: 0, req, overrideAccess: true })
      if (!['owner', 'admin', 'sales'].includes(String(person.role))) throw new Error('Le responsable doit avoir accès au pilotage commercial.')
      const minutes = Number(next.notifyMinutesBefore || 0), due = Date.parse(String(next.dueAt))
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080 || !Number.isFinite(due)) throw new Error('Échéance ou délai de rappel invalide.')
      const changed = !originalDoc || ['state', 'dueAt', 'notifyAssignee', 'notifyMinutesBefore'].some(key => JSON.stringify(next[key]) !== JSON.stringify(originalDoc[key])) || String(relationId(next.assignee)) !== String(relationId(originalDoc.assignee))
      return { ...data, reminderIdentity: changed ? randomUUID() : originalDoc.reminderIdentity || randomUUID(), completedAt: next.state === 'done' ? originalDoc?.completedAt || new Date().toISOString() : null, notifyAt: next.notifyAssignee && next.state === 'open' ? new Date(due - minutes * 60_000).toISOString() : null }
    }],
    afterChange: [async ({ doc, previousDoc, req }) => {
      if (previousDoc && doc.reminderIdentity !== previousDoc.reminderIdentity) await req.payload.update({ collection: 'notifications', where: { and: [{ task: { equals: doc.id } }, { state: { in: ['pending', 'processing', 'failed'] } }] }, data: { state: 'cancelled', error: 'Rappel terminé, annulé ou reprogrammé.', leaseUntil: null }, req: { transactionID: req.transactionID }, overrideAccess: true })
      return doc
    }],
    beforeDelete: [async ({ id, req }) => {
      const pending: Where = { and: [{ task: { equals: id } }, { state: { in: ['pending', 'processing', 'failed'] } }] }
      await req.payload.update({ collection: 'notifications', where: pending, data: { state: 'cancelled', error: 'Tâche supprimée.', leaseUntil: null }, req: { transactionID: req.transactionID }, overrideAccess: true })
      await req.payload.update({ collection: 'notifications', where: { task: { equals: id } }, data: { task: null }, req: { transactionID: req.transactionID }, overrideAccess: true })
    }],
  },
  fields: [
    text('title', 'Objet', true), { name: 'description', label: 'Détails', type: 'textarea' },
    { name: 'kind', label: 'Type', type: 'select', defaultValue: 'reminder', options: [
      { value: 'reminder', label: 'Rappel commercial' }, { value: 'publication', label: 'Publication' }, { value: 'showreel', label: 'Showreel' }, { value: 'price', label: 'Tarif' }, { value: 'rights', label: 'Droit de diffusion' }, { value: 'case-study', label: 'Étude de cas' },
    ] },
    { name: 'dueAt', label: 'Échéance', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'assignee', label: 'Responsable', type: 'relationship', relationTo: 'users', required: true },
    { name: 'state', label: 'État', type: 'select', defaultValue: 'open', options: [{ value: 'open', label: 'À faire' }, { value: 'done', label: 'Terminée' }, { value: 'cancelled', label: 'Annulée' }] },
    { name: 'completedAt', label: 'Terminée le', type: 'date', admin: { readOnly: true } },
    { name: 'notifyAssignee', label: 'Prévenir le responsable par email', type: 'checkbox', defaultValue: false, admin: { description: 'Notification persistante ; capturée en test tant que l’envoi réel n’est pas activé.' } },
    { name: 'notifyMinutesBefore', label: 'Minutes avant l’échéance', type: 'number', defaultValue: 0, min: 0, max: 10080, admin: { description: '0 : à l’échéance ; 60 : une heure ; 1440 : un jour ; 10080 : une semaine.' } },
    { name: 'notifyAt', label: 'Déclenchement du rappel', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'reminderIdentity', type: 'text', admin: { hidden: true, readOnly: true } },
    { name: 'brief', label: 'Demande liée', type: 'relationship', relationTo: 'briefs' },
    { name: 'contentPath', label: 'Lien de la fiche de contenu', type: 'text', validate: (value: unknown) => !value || (typeof value === 'string' && value.startsWith('/admin/') && !value.includes('://')) || 'Utilisez une adresse interne /admin/…' },
  ],
};

export const AnalyticsEvents: CollectionConfig = {
  slug: 'analytics-events', labels: { singular: 'Événement de mesure', plural: 'Mesure agrégée' },
  admin: { useAsTitle: 'event', group: 'Statistiques', defaultColumns: ['event', 'day', 'pageKey', 'createdAt'], description: 'Événements minimaux sans coordonnées, texte libre, IP ou URL. La collecte navigateur facultative exige une activation explicite et le consentement.' },
  access: { read: canSell, create: never, update: never, delete: canManage },
  fields: [
    { ...text('dedupeKey', 'Clé de déduplication', true), unique: true, index: true },
    { name: 'event', label: 'Événement', type: 'select', required: true, index: true, options: ['brief_received', 'page_view', 'project_view', 'video_play_manual', 'video_play_auto', 'video_progress', 'form_start', 'form_step', 'contact_click', 'technical_error'] },
    { ...text('day', 'Jour UTC', true), index: true }, text('pageKey', 'Clé de contenu'),
    { name: 'step', label: 'Étape ou progression', type: 'number', min: 0, max: 100 },
    { name: 'device', label: 'Appareil', type: 'select', options: ['mobile', 'tablet', 'desktop', 'unknown'] },
    { name: 'source', label: 'Source de mesure', type: 'select', required: true, options: ['server-confirmed', 'consented-browser'] },
    { name:'entry',label:'Première page consentie de cet onglet chargé',type:'checkbox' },
    { name:'acquisition',label:'Origine catégorisée localement',type:'select',options:['direct','internal','search','social','referral','unknown'] },
  ],
};

export const SubmissionLimits: CollectionConfig = {
  slug: 'submission-limits', labels: { singular: 'Limite de soumission', plural: 'Limites de soumission' },
  admin: { hidden: true }, access: { read: never, create: never, update: never, delete: canManage },
  fields: [{ ...text('key', 'Clé', true), unique: true, index: true }, { name: 'expiresAt', label: 'Expiration', type: 'date', required: true, index: true }],
};

export const operationCollections: CollectionConfig[] = [Forms, CRMStatuses, Briefs, Notifications, Tasks, AnalyticsEvents, SubmissionLimits];
