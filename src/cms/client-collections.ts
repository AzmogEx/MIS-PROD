import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { APIError, type Access, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook, type CollectionBeforeValidateHook, type CollectionConfig, type PayloadRequest, type Where } from 'payload'
import { getAuthorizedProject, isClientStaff, isUnexpired, privateFileLimits, privateFilesDirectory, privateStorageObservation, relationID, validateTimecode, type Relation, type UserIdentity } from './client-services'
import { validateMediaFile, MediaError } from './media-services'

const staff: Access = ({ req }) => isClientStaff(req.user)
const deny: Access = () => false
const projectField = { name: 'project', label: 'Projet', type: 'relationship' as const, relationTo: 'projects' as const, required: true, index: true }

/** Must run before generateFileData: a later hook cannot undo disk overwrites. */
const privateFileBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation === 'create' && req.file) {
    const max = privateFileLimits().maxFileBytes
    if (req.file.data.length > max) throw new APIError(`Le fichier dépasse la limite de ${Math.round(max / 1048576)} Mo.`, 413)
    try { await validateMediaFile(req.file, { maxFileBytes: max, allowWav: true }) } catch (error) { if (error instanceof MediaError) throw new APIError(error.message, error.status); throw error }
  }
  if (operation !== 'update' && operation !== 'updateByID') return args
  const edits = req.query?.uploadEdits
  if (req.file || (edits && (typeof edits !== 'object' || Object.keys(edits).length))) throw new APIError('Le fichier privé est immuable, y compris son recadrage. Importez une nouvelle version.', 400)
  const input = args as { id?: string | number; data?: Record<string, unknown> }
  if (!input.data) return args
  const physical = ['filename', 'url', 'mimeType', 'filesize', 'width', 'height', 'sizes', 'thumbnailURL', 'focalX', 'focalY', 'prefix', '_objectKey', 'checksum'].filter(key => key in input.data!)
  if (physical.length) {
    if (!input.id) throw new APIError('Les références physiques des fichiers privés ne peuvent pas être modifiées par lot.', 400)
    const original = await req.payload.findByID({ collection: 'private-files', id: input.id, depth: 0, req, overrideAccess: false })
    for (const key of physical) {
      if (!isDeepStrictEqual(input.data[key], original[key])) throw new APIError(`Les références physiques du fichier privé sont immuables (${key}). Importez une nouvelle version.`, 400)
      delete input.data[key] // An unchanged focal input must not trigger processing either.
    }
  }
  return args
}

async function memberProjectIDs(req: PayloadRequest) {
  if (!req.user) return []
  const projects = await req.payload.find({ collection: 'projects', where: { and: [{ members: { contains: req.user.id } }, { archived: { not_equals: true } }] }, depth: 0, pagination: false, overrideAccess: true, req })
  return projects.docs.map((project) => project.id)
}

const projectRead: Access = async ({ req }) => {
  if (isClientStaff(req.user)) return true
  if (!req.user) return false
  const ids = await memberProjectIDs(req)
  return { project: { in: ids } } satisfies Where
}

const requireMemberOnCreate: Access = async ({ req, data }) => {
  if (!req.user || !data?.project) return false
  try { await getAuthorizedProject(req.payload, data.project, req.user, req); return true } catch { return false }
}

const immutable: CollectionBeforeChangeHook = ({ operation, data }) => {
  if (operation === 'update') throw new Error('Cette version est immuable. Créez une nouvelle version pour conserver les validations précédentes.')
  return data
}

const bindDeliverable: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!req.user) throw new Error('Connexion requise.')
  if (!data) throw new Error('Données requises.')
  const deliverableID = relationID(data.deliverable as Relation)
  if (deliverableID === undefined) throw new Error('Version de livrable requise.')
  const deliverable = await req.payload.findByID({ collection: 'deliverables', id: deliverableID, depth: 0, overrideAccess: true, req })
  const project = await getAuthorizedProject(req.payload, deliverable.project as Relation, req.user, req)
  if (!deliverable.clientVisible && !isClientStaff(req.user)) throw new Error('Version non partagée avec le client.')
  if (String(relationID(data.project as Relation)) !== String(project.id)) throw new Error('La version ne correspond pas au projet.')
  return { ...data, author: req.user.id, recordedAt: new Date().toISOString(), timecode: validateTimecode(data.timecode, deliverable.duration as number | undefined) }
}

const deliveryRead: Access = async (args) => {
  const access = await projectRead(args)
  return access === true || access === false ? access : { and: [access, { clientVisible: { equals: true } }] }
}

export const clientCollections: CollectionConfig[] = [
  {
    slug: 'projects', labels: { singular: 'Projet client', plural: 'Projets clients' },
    admin: { group: 'Demandes et clients', useAsTitle: 'title', defaultColumns: ['title', 'status', 'dueAt', 'updatedAt'] },
    access: {
      create: staff, update: staff, delete: deny,
      read: ({ req }) => isClientStaff(req.user) ? true : req.user ? { and: [{ members: { contains: req.user.id } }, { archived: { not_equals: true } }] } as Where : false,
    },
    fields: [
      { name: 'title', label: 'Nom du projet', type: 'text', required: true },
      { name: 'description', label: 'Présentation au client', type: 'textarea' },
      { name: 'members', label: 'Comptes autorisés', type: 'relationship', relationTo: 'users', hasMany: true, required: true },
      { name: 'owner', label: 'Responsable MIS', type: 'relationship', relationTo: 'users' },
      { name: 'status', label: 'État', type: 'select', defaultValue: 'preparation', required: true, options: [{ label: 'Préparation', value: 'preparation' }, { label: 'Production', value: 'production' }, { label: 'À valider', value: 'review' }, { label: 'Livré', value: 'delivered' }] },
      { name: 'dueAt', label: 'Échéance', type: 'date' },
      { name: 'budget', label: 'Montant convenu (€ HT, saisi manuellement)', type: 'number', min: 0 },
      { name: 'archived', label: 'Archivé — retire immédiatement les accès clients et liens partagés', type: 'checkbox', defaultValue: false },
    ],
  },
  {
    slug: 'private-files', labels: { singular: 'Fichier privé', plural: 'Fichiers privés' },
    admin: { group: 'Médias', useAsTitle: 'title', defaultColumns: ['title', 'project', 'mimeType', 'filesize', 'expiresAt'] },
    access: { create: staff, read: staff, update: staff, delete: deny },
    upload: { staticDir: privateFilesDirectory, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'text/vtt'], bulkUpload: true, disableLocalStorage: false },
    fields: [
      projectField,
      { name: 'title', label: 'Titre', type: 'text', required: true },
      { name: 'kind', label: 'Usage', type: 'select', defaultValue: 'delivery', options: [{ label: 'Livrable', value: 'delivery' }, { label: 'Devis', value: 'quote' }, { label: 'Facture', value: 'invoice' }, { label: 'Contrat', value: 'contract' }, { label: 'Autre document', value: 'document' }] },
      { name: 'clientVisible', label: 'Document partagé dans l’espace client (hors versions de livrables)', type: 'checkbox', defaultValue: false },
      { name: 'checksum', label: 'Empreinte SHA-256', type: 'text', admin: { readOnly: true }, access: { update: () => false } },
      { name: 'expiresAt', label: 'Fin des droits de téléchargement', type: 'date' },
      { name: 'revoked', label: 'Accès révoqué', type: 'checkbox', defaultValue: false },
      { name: 'credits', label: 'Crédits et restrictions', type: 'textarea' },
    ],
    hooks: { beforeOperation: [privateFileBeforeOperation], beforeChange: [async ({ data, originalDoc, operation, req }) => {
      if (operation === 'update' && (req.file || String(relationID(data.project as Relation) ?? relationID(originalDoc.project)) !== String(relationID(originalDoc.project)))) throw new Error('Le fichier et son projet sont immuables. Importez une nouvelle version.')
      if (req.file) {
        const max = privateFileLimits().maxFileBytes
        const size = req.file.data.length
        if (size > max) throw new Error(`Le fichier dépasse la limite de ${Math.round(max / 1048576)} Mo.`)
        const upload = req.payload.collections['private-files'].config.upload
        const storage = await privateStorageObservation(upload && upload.staticDir || privateFilesDirectory)
        if (storage.bytes + size > storage.maxStorageBytes) throw new APIError('Le quota des fichiers privés est atteint. Les versions et fichiers existants restent conservés.', 413)
        data.checksum = createHash('sha256').update(req.file.data).digest('hex')
      }
      return data
    }] },
  },
  {
    slug: 'deliverables', labels: { singular: 'Version de livrable', plural: 'Versions de livrables' },
    admin: { group: 'Demandes et clients', useAsTitle: 'title', defaultColumns: ['title', 'project', 'version', 'createdAt'] },
    access: { create: staff, read: deliveryRead, update: deny, delete: deny },
    fields: [projectField,
      { name: 'title', label: 'Titre', type: 'text', required: true },
      { name: 'version', label: 'Version (ex. V1, V2)', type: 'text', required: true },
      { name: 'file', label: 'Fichier de cette version', type: 'upload', relationTo: 'private-files', required: true },
      { name: 'note', label: 'Note de livraison', type: 'textarea' },
      { name: 'duration', label: 'Durée vidéo en secondes', type: 'number', min: 0, max: 86400 },
      { name: 'clientVisible', label: 'Disponible dans l’espace client', type: 'checkbox', defaultValue: true },
    ],
    hooks: { beforeChange: [immutable, async ({ data, req }) => {
      const file = await req.payload.findByID({ collection: 'private-files', id: relationID(data.file as Relation)!, depth: 0, overrideAccess: true, req })
      if (String(relationID(file.project as Relation)) !== String(relationID(data.project as Relation))) throw new Error('Le fichier doit appartenir au même projet.')
      if (file.revoked || !isUnexpired(file.expiresAt as string | undefined)) throw new Error('Les droits du fichier ne permettent plus sa diffusion.')
      const existing = await req.payload.find({ collection: 'deliverables', where: { and: [{ project: { equals: relationID(data.project as Relation) } }, { title: { equals: data.title } }, { version: { equals: data.version } }] }, limit: 1, depth: 0, req, overrideAccess: true })
      if (existing.totalDocs) throw new Error('Cette version existe déjà pour ce livrable.')
      return data
    }] },
  },
  {
    slug: 'video-comments', labels: { singular: 'Commentaire client', plural: 'Commentaires clients' },
    admin: { group: 'Demandes et clients', useAsTitle: 'body', defaultColumns: ['project', 'deliverable', 'author', 'recordedAt'] },
    access: { create: requireMemberOnCreate, read: async (args) => { const access = await projectRead(args); return typeof access === 'boolean' ? access : { and: [access, { 'deliverable.clientVisible': { equals: true } }] } }, update: deny, delete: deny },
    fields: [projectField,
      { name: 'deliverable', label: 'Version précise', type: 'relationship', relationTo: 'deliverables', required: true },
      { name: 'author', label: 'Auteur', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
      { name: 'body', label: 'Commentaire', type: 'textarea', required: true, maxLength: 5000 },
      { name: 'timecode', label: 'Repère vidéo (secondes)', type: 'number', min: 0, max: 86400 },
      { name: 'recordedAt', label: 'Date', type: 'date', required: true, admin: { readOnly: true } },
    ],
    hooks: { beforeChange: [immutable], beforeValidate: [bindDeliverable] },
  },
  {
    slug: 'approvals', labels: { singular: 'Validation client', plural: 'Validations clients' },
    admin: { group: 'Demandes et clients', useAsTitle: 'decision', defaultColumns: ['project', 'deliverable', 'decision', 'author', 'recordedAt'] },
    access: { create: requireMemberOnCreate, read: async (args) => { const access = await projectRead(args); return typeof access === 'boolean' ? access : { and: [access, { 'deliverable.clientVisible': { equals: true } }] } }, update: deny, delete: deny },
    fields: [projectField,
      { name: 'deliverable', label: 'Version précise', type: 'relationship', relationTo: 'deliverables', required: true },
      { name: 'author', label: 'Auteur', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
      { name: 'decision', label: 'Décision', type: 'select', required: true, options: [{ label: 'Version acceptée', value: 'accepted' }, { label: 'Modifications demandées', value: 'changes_requested' }] },
      { name: 'note', label: 'Précisions', type: 'textarea', maxLength: 5000 },
      { name: 'recordedAt', label: 'Date', type: 'date', required: true, admin: { readOnly: true } },
      { name: 'deduplicationKey', type: 'text', unique: true, admin: { hidden: true }, access: { read: () => false } },
    ],
    hooks: { beforeChange: [immutable], beforeValidate: [bindDeliverable, ({ data }) => ({ ...data, deduplicationKey: `${relationID(data?.deliverable as Relation)}:${relationID(data?.author as Relation)}:${data?.decision}` })] },
  },
  {
    slug: 'file-shares', labels: { singular: 'Lien temporaire', plural: 'Liens temporaires' },
    admin: { group: 'Demandes et clients', useAsTitle: 'title', description: 'Créez les liens depuis l’espace client. Leur révocation est immédiate.' },
    access: { create: deny, read: staff, update: staff, delete: deny },
    fields: [projectField,
      { name: 'title', label: 'Intitulé', type: 'text', required: true },
      { name: 'file', label: 'Fichier', type: 'relationship', relationTo: 'private-files', required: true, access: { update: () => false } },
      { name: 'tokenHash', type: 'text', required: true, unique: true, index: true, admin: { hidden: true }, access: { read: () => false, update: () => false } },
      { name: 'expiresAt', label: 'Expiration', type: 'date', required: true },
      { name: 'revoked', label: 'Révoqué', type: 'checkbox', defaultValue: false },
      { name: 'createdBy', label: 'Créé par', type: 'relationship', relationTo: 'users', required: true, access: { update: () => false } },
    ],
  },
  {
    slug: 'commercial-portfolios', labels: { singular: 'Portfolio commercial', plural: 'Portfolios commerciaux' },
    admin: { group: 'Demandes et clients', useAsTitle: 'title' },
    access: { create: staff, read: ({ req }) => isClientStaff(req.user) ? true : req.user ? { and: [{ members: { contains: req.user.id } }, { revoked: { not_equals: true } }, { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }] }] } as Where : false, update: staff, delete: deny },
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true },
      { name: 'introduction', label: 'Introduction personnalisée', type: 'textarea' },
      { name: 'members', label: 'Destinataires autorisés (connexion obligatoire)', type: 'relationship', relationTo: 'users', hasMany: true, required: true },
      { name: 'expiresAt', label: 'Fin de validité', type: 'date', required: true },
      { name: 'revoked', label: 'Accès révoqué', type: 'checkbox', defaultValue: false },
      { name: 'items', label: 'Sélection', type: 'array', fields: [
        { name: 'title', label: 'Titre', type: 'text', required: true },
        { name: 'context', label: 'Contexte / crédits', type: 'textarea' },
        { name: 'media', label: 'Média autorisé', type: 'upload', relationTo: 'media', required: true },
        { name: 'rightsConfirmed', label: 'Droits de diffusion vérifiés pour ces destinataires', type: 'checkbox', required: true, validate: (value) => value === true || 'Confirmez les droits de diffusion avant de partager ce média.' },
      ] },
    ],
  },
]

export type ClientUser = UserIdentity
