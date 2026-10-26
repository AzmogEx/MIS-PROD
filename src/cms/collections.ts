import path from 'node:path'
import type { CollectionConfig, CollectionAfterChangeHook, GlobalConfig, PayloadRequest, Where } from 'payload'
import { canEdit, canManage, hasRole, isStaff, managerField, nobody, publishedRead, staffRead } from './access'
import { pageBlocks, safeLink } from './blocks'
import { contentFields } from './content-fields'
import { mfaFields, mfaUserGuard, mfaBeforeOperation, mfaBeforeLogin, mfaAfterOperation, mfaAfterError } from './mfa'
import { contentRevision, translationFields } from './translation'
import { mediaBeforeOperation, mediaUploadGuard } from './media-services'
import { capturePagePublication } from './editor-service'

export const auditChange: CollectionAfterChangeHook = async ({ req, doc, collection, operation }) => {
  if (req.context.skipAudit || collection.slug === 'audit-log') return doc
  await req.payload.create({ collection: 'audit-log', req, overrideAccess: true, data: {
    action: operation, collectionName: collection.slug, documentID: String(doc.id),
    actor: req.user?.id ?? null, occurredAt: new Date().toISOString(),
  } })
  return doc
}

// Only Payload's own forgotPassword operation may prepare a recovery token on a
// protected account. JSON body/context flags cannot manufacture this permission.
const ownerRecoveryRequests = new WeakMap<PayloadRequest, { email: string; token?: string; expires?: unknown }>()

const users: CollectionConfig = {
  slug: 'users', labels: { singular: 'Compte', plural: 'Équipe et comptes' },
  auth: { tokenExpiration: 60 * 60 * 8, maxLoginAttempts: 5, lockTime: 10 * 60 * 1000, useSessions: true, cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' } },
  admin: { group: 'Équipe et paramètres', useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'] },
  access: {
    admin: ({ req }) => isStaff(req.user), create: canManage,
    read: ({ req }) => hasRole(req.user, ['owner', 'admin']) ? true : req.user ? { id: { equals: req.user.id } } : false,
    update: ({ req }) => req.user?.role === 'owner' ? true : req.user?.role === 'admin' ? { role: { not_equals: 'owner' } } as Where : req.user ? { id: { equals: req.user.id } } as Where : false,
    delete: canManage,
  },
  fields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'role', label: 'Rôle', type: 'select', required: true, defaultValue: 'client', saveToJWT: true,
      access: { create: managerField, update: managerField },
      options: [{ label: 'Propriétaire', value: 'owner' }, { label: 'Administrateur', value: 'admin' }, { label: 'Éditeur', value: 'editor' }, { label: 'Commercial', value: 'sales' }, { label: 'Intervenant limité', value: 'contributor' }, { label: 'Client', value: 'client' }] },
    { name: 'locale', label: 'Langue', type: 'select', options: ['fr', 'en'], defaultValue: 'fr' },
    ...mfaFields,
  ],
  hooks: {
    beforeOperation: [mfaBeforeOperation, ({ args, operation, req }) => {
      if (operation === 'forgotPassword') {
        const data = ('data' in args ? args.data : req.data) as { email?: unknown } | undefined
        if (typeof data?.email === 'string') ownerRecoveryRequests.set(req, { email: data.email.trim().toLowerCase() })
      } else if (operation === 'update' && ownerRecoveryRequests.has(req)) {
        // Inspect the submitted patch before Payload merges original values.
        const data = ('data' in args ? args.data : undefined) as Record<string, unknown> | undefined
        if (data && typeof data.resetPasswordToken === 'string' && data.resetPasswordExpiration
          && Object.keys(data).every(key => ['resetPasswordToken', 'resetPasswordExpiration'].includes(key))) {
          Object.assign(ownerRecoveryRequests.get(req)!, { token: data.resetPasswordToken, expires: data.resetPasswordExpiration })
        } else ownerRecoveryRequests.delete(req)
      }
      return args
    }], beforeLogin: [mfaBeforeLogin], afterOperation: [mfaAfterOperation, ({ operation, req, result }) => {
      if (operation === 'forgotPassword') ownerRecoveryRequests.delete(req)
      return result
    }], afterError: [mfaAfterError, ({ req }) => { ownerRecoveryRequests.delete(req) }],
    beforeChange: [mfaUserGuard, async ({ req, data, originalDoc, operation }) => {
      let bootstrap = false
      if (operation === 'create' && !req.user) {
        const accounts = await req.payload.count({ collection: 'users', req })
        bootstrap = !accounts.totalDocs && req.payloadAPI === 'local' && req.context.bootstrap === true
        if (!bootstrap) throw new Error('Initialisez le premier propriétaire avec npm run cms:owner depuis le serveur. La création publique de comptes est désactivée.')
        data.role = 'owner'
      }
      if (data.password && String(data.password).length < 14) throw new Error('Utilisez un mot de passe d’au moins 14 caractères.')
      const managesAccounts = hasRole(req.user, ['owner', 'admin'])
      const recovery = ownerRecoveryRequests.get(req)
      const recoveryOnly = operation === 'update' && recovery?.email === originalDoc?.email && !!recovery?.token
        && data.resetPasswordToken === recovery.token && data.resetPasswordExpiration === recovery.expires
      if (recoveryOnly) ownerRecoveryRequests.delete(req)
      if (operation === 'create' && !bootstrap && !managesAccounts) throw new Error('Création de compte réservée aux administrateurs.')
      if (operation === 'update' && !recoveryOnly) {
        if (originalDoc?.role === 'owner' && req.user?.role !== 'owner') throw new Error('Seul un propriétaire peut modifier un compte propriétaire.')
        if (!managesAccounts && (!req.user || String(req.user.id) !== String(originalDoc?.id))) throw new Error('Modification de compte interdite.')
        if (data.role && data.role !== originalDoc?.role && !managesAccounts) throw new Error('Modification de rôle réservée aux administrateurs.')
      }
      if (data.role === 'owner' && originalDoc?.role !== 'owner' && !bootstrap && req.user?.role !== 'owner') throw new Error('Seul un propriétaire peut nommer un propriétaire.')
      if (originalDoc?.role === 'owner' && data.role && data.role !== 'owner') {
        if (req.user?.role !== 'owner') throw new Error('Seul un propriétaire peut modifier ce rôle.')
        const owners = await req.payload.count({ collection: 'users', where: { role: { equals: 'owner' } }, req })
        if (owners.totalDocs <= 1) throw new Error('Le dernier propriétaire doit être conservé.')
      }
      return data
    }],
    beforeDelete: [async ({ req, id }) => {
      if (!hasRole(req.user, ['owner', 'admin'])) throw new Error('Suppression de compte réservée aux administrateurs.')
      const account = await req.payload.findByID({ collection: 'users', id, req })
      if (account.role === 'owner') {
        if (req.user?.role !== 'owner') throw new Error('Seul un propriétaire peut supprimer ce compte.')
        const owners = await req.payload.count({ collection: 'users', where: { role: { equals: 'owner' } }, req })
        if (owners.totalDocs <= 1) throw new Error('Impossible de supprimer le dernier propriétaire.')
      }
    }], afterChange: [auditChange],
  },
}

export const pages: CollectionConfig = {
  slug: 'pages', labels: { singular: 'Page', plural: 'Pages du site' },
  admin: { group: 'Site et contenus', useAsTitle: 'title', defaultColumns: ['title', 'path', '_status', 'updatedAt'],
    livePreview: { url: ({ data, locale }) => `/apercu/${data.id}?locale=${locale.code === 'en' ? 'en' : 'fr'}`, breakpoints: [{ label: 'Mobile', name: 'mobile', width: 390, height: 844 }, { label: 'Tablette', name: 'tablet', width: 768, height: 1024 }, { label: 'Ordinateur', name: 'desktop', width: 1440, height: 900 }] },
    preview: (doc, { locale }) => `/apercu/${doc.id}?locale=${locale === 'en' ? 'en' : 'fr'}`,
  },
  access: { read: publishedRead, create: canEdit, update: canEdit, delete: canManage, readVersions: canEdit },
  trash: true,
  versions: { maxPerDoc: 100, drafts: { autosave: { interval: 1500 }, schedulePublish: true } },
  lockDocuments: { duration: 300 },
  fields: [
    { name: 'visualEditor', type: 'ui', admin: { components: { Field: '/src/components/cms/page-actions#PageActions' } } },
    { name: 'title', label: 'Titre dans l’administration', type: 'text', required: true, localized: true },
    { name: 'path', label: 'Adresse (ex. /institutions)', type: 'text', required: true, unique: true, index: true,
      validate: (value: unknown) => /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(String(value)) && !/^\/(api|admin|apercu|espace-client)(\/|$)/.test(String(value)) || 'Adresse interne valide requise, hors chemins réservés.' },
    { name: 'parent', label: 'Page parente', type: 'relationship', relationTo: 'pages' },
    { name: 'kind', label: 'Type de page', type: 'select', options: ['page', 'universe', 'legal'], defaultValue: 'page' },
    { name: 'layout', label: 'Composition', type: 'blocks', blocks: pageBlocks },
    { name: 'seo', label: 'Référencement', type: 'group', fields: [
      { name: 'title', label: 'Titre SEO', type: 'text', localized: true }, { name: 'description', label: 'Description', type: 'textarea', localized: true },
      { name: 'noindex', label: 'Exclure des moteurs de recherche', type: 'checkbox' }, { name: 'image', label: 'Image de partage', type: 'upload', relationTo: 'media' },
    ] },
    { name: 'translationState', label: 'Traduction', type: 'select', localized: true, options: ['source', 'draft', 'reviewed', 'outdated'], defaultValue: 'source' },
    ...translationFields,
    { name: 'sourceKey', label: 'Identifiant d’import', type: 'text', unique: true, access: { read: ({ req }) => hasRole(req.user, ['owner', 'admin', 'editor']) }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'provenance', label: 'Provenance', type: 'textarea', access: { read: ({ req }) => hasRole(req.user, ['owner', 'admin', 'editor']) }, admin: { position: 'sidebar' } },
  ],
  hooks: { beforeChange: [async ({ req, data, originalDoc }) => {
    if (req.locale === 'en') {
      if (data.translationState === 'reviewed') data.reviewedSourceRevision = originalDoc?.sourceRevision
    } else data.sourceRevision = contentRevision({ ...originalDoc, ...data }, ['title','layout','seo'])
    if (data._status === 'published' && req.user && !hasRole(req.user, ['owner', 'admin', 'editor'])) throw new Error('Publication interdite.')
    if (originalDoc?.path && data.path && originalDoc.path !== data.path && data._status === 'published') {
      const existing = await req.payload.find({ collection: 'redirects', where: { from: { equals: originalDoc.path } }, req, limit: 1 })
      if (!existing.docs.length) await req.payload.create({ collection: 'redirects', req, data: { from: originalDoc.path, to: data.path } })
    }
    return data
  }], afterRead: [({ doc, req }) => { if(req.locale==='en' && doc.reviewedSourceRevision!==doc.sourceRevision) doc.translationState='outdated'; return doc }], afterChange: [auditChange, capturePagePublication] },
}

const media: CollectionConfig = {
  slug: 'media', labels: { singular: 'Média public', plural: 'Médiathèque' },
  admin: { group: 'Médias', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'collection', 'rightsUntil', 'filesize'] },
  access: { read: ({ req }) => isStaff(req.user) ? true : { and: [{ visibility: { equals: 'public' } }, { or: [{ rightsUntil: { exists: false } }, { rightsUntil: { greater_than: new Date().toISOString() } }] }] } as Where, create: canEdit, update: canEdit, delete: canManage },
  upload: { staticDir: path.resolve(process.env.CMS_MEDIA_DIR || '.data/media'), mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'video/mp4', 'video/webm', 'audio/mpeg', 'text/vtt', 'application/pdf'],
    modifyResponseHeaders: ({ headers }) => {
      // Rights and visibility are mutable, including for an already-known URL.
      headers.set('Cache-Control', 'private, no-store, max-age=0')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
    focalPoint: true, crop: true, imageSizes: [{ name: 'card', width: 800, height: 600, formatOptions: { format: 'webp' } }, { name: 'mobile', width: 480, formatOptions: { format: 'webp' } }, { name: 'large', width: 1600, formatOptions: { format: 'webp' } }], adminThumbnail: 'card' },
  fields: [
    { name: 'alt', label: 'Texte alternatif / description', type: 'text', required: true, localized: true },
    { name: 'collection', label: 'Collection', type: 'text', index: true }, { name: 'tags', label: 'Étiquettes', type: 'text', hasMany: true },
    { name: 'credit', label: 'Crédits', type: 'text' }, { name: 'authorization', label: 'Autorisation et restrictions de diffusion', type: 'textarea', access: { read: ({ req }) => isStaff(req.user) } },
    { name: 'visibility', label: 'Diffusion', type: 'select', options: ['public', 'restricted'], defaultValue: 'restricted', required: true },
    { name: 'rightsUntil', label: 'Fin des droits (dépublication automatique)', type: 'date' },
    { name: 'poster', label: 'Affiche vidéo', type: 'upload', relationTo: 'media', filterOptions: { mimeType: { like: 'image/' } }, admin: { description: 'Image publiée séparément pour être visible sur le site public.' } },
    { name: 'captions', label: 'Sous-titres VTT', type: 'upload', relationTo: 'media', filterOptions: { mimeType: { equals: 'text/vtt' } }, admin: { description: 'Fichier WebVTT ; renseigner sa langue et sa diffusion publique.' } },
    { name: 'transcript', label: 'Transcription', type: 'textarea', localized: true },
    { name: 'language', label: 'Langue', type: 'select', options: ['fr', 'en'], defaultValue: 'fr' },
    { name: 'sourceKey', type: 'text', unique: true, access: { read: ({ req }) => isStaff(req.user) }, admin: { readOnly: true } },
  ],
  hooks: {
    beforeOperation: [mediaBeforeOperation],
    beforeChange: [mediaUploadGuard, async ({ req, data, operation }) => {
      if (operation === 'update' && req.file) throw new Error('Conservez les versions : importez le nouveau fichier puis remplacez sa référence dans le contenu. L’ancien fichier reste restaurable.')
      const max = Number(process.env.MEDIA_MAX_BYTES || 100 * 1024 * 1024)
      if (req.file && req.file.size > max) throw new Error(`Fichier trop volumineux (limite ${Math.round(max / 1024 / 1024)} Mo).`)
      return data
    }],
    beforeDelete: [async () => { throw new Error('Conservation des historiques : la suppression physique est désactivée. Restreignez la diffusion pour retirer un média public.') }],
    afterChange: [auditChange],
  },
}

const shared: CollectionConfig = {
  slug: 'shared-sections', labels: { singular: 'Section synchronisée', plural: 'Sections synchronisées' },
  admin: { group: 'Site et contenus', useAsTitle: 'title', description: 'Une publication modifie tous les emplacements qui référencent cette section.' },
  access: { read: publishedRead, create: canEdit, update: canEdit, delete: canManage, readVersions: canEdit },
  trash: true, versions: { drafts: true, maxPerDoc: 100 },
  fields: [{ name: 'title', type: 'text', required: true }, { name: 'layout', type: 'blocks', blocks: pageBlocks.filter(b => b.slug !== 'shared') }], hooks: { afterChange: [auditChange] },
}
const templates: CollectionConfig = {
  slug: 'section-templates', labels: { singular: 'Modèle', plural: 'Modèles de composition' },
  admin: { group: 'Site et contenus', useAsTitle: 'title', description: 'Les modèles sont copiés : modifier un modèle ne modifie aucune page existante.' },
  access: { read: canEdit, create: canEdit, update: canEdit, delete: canManage },
  fields: [{ name: 'title', type: 'text', required: true }, { name: 'layout', type: 'blocks', blocks: pageBlocks }],
}
const redirects: CollectionConfig = {
  slug: 'redirects', labels: { singular: 'Redirection', plural: 'Redirections' }, admin: { group: 'Site et contenus', useAsTitle: 'from' },
  access: { read: canEdit, create: canEdit, update: canEdit, delete: canManage },
  fields: [{ name: 'from', label: 'Ancienne adresse', type: 'text', required: true, unique: true }, { name: 'to', label: 'Destination', type: 'text', required: true, validate: safeLink }],
  hooks: { beforeValidate: [async ({ data, req, originalDoc }) => {
    if (!data) return data
    const from = data.from ?? originalDoc?.from; const to = data.to ?? originalDoc?.to
    if (!String(from).startsWith('/') || String(from).startsWith('//') || !String(to).startsWith('/') || String(to).startsWith('//')) throw new Error('Redirections internes uniquement.')
    const visited = new Set([from]); let next = to
    for (let i = 0; i < 50; i++) {
      if (visited.has(next)) throw new Error('Cette redirection crée une boucle.')
      visited.add(next)
      const found = await req.payload.find({ collection: 'redirects', where: { from: { equals: next } }, req, limit: 1 })
      if (!found.docs.length) return data
      next = found.docs[0].to
    }
    throw new Error('Chaîne de redirections trop longue.')
  }] },
}
const audit: CollectionConfig = {
  slug: 'audit-log', labels: { singular: 'Action', plural: 'Journal des actions' }, admin: { group: 'Équipe et paramètres', defaultColumns: ['occurredAt', 'action', 'collectionName', 'documentID', 'actor'] },
  access: { read: canManage, create: nobody, update: nobody, delete: nobody },
  fields: [{ name: 'action', type: 'text', required: true }, { name: 'collectionName', type: 'text' }, { name: 'documentID', type: 'text' }, { name: 'actor', type: 'relationship', relationTo: 'users' }, { name: 'occurredAt', type: 'date', required: true }],
}
const releases: CollectionConfig = {
  slug: 'publication-releases', labels: { singular: 'Publication', plural: 'Publications cohérentes' }, admin: { group: 'Site et contenus', useAsTitle: 'title' },
  access: { read: canEdit, create: nobody, update: nobody, delete: nobody },
  fields: [{ name: 'restoreAction', type: 'ui', admin: { components: { Field: '/src/components/cms/page-actions#RestoreRelease' } } }, { name: 'title', type: 'text' }, { name: 'page', type: 'relationship', relationTo: 'pages', required: true }, { name: 'pageSnapshot', type: 'json', admin: { readOnly: true } }, { name: 'contentSnapshot', type: 'json', admin: { readOnly: true } }, { name: 'actor', type: 'relationship', relationTo: 'users' }],
}
export const coreCollections = [users, pages, media, shared, templates, redirects, audit, releases]
export const siteContent: GlobalConfig = {
  slug: 'site-content', label: 'Identité, contenus et navigation', admin: { group: 'Site et contenus', description: 'Contenus historiques importés. Les chiffres et références hérités doivent être vérifiés avant diffusion en production.' },
  access: { read: staffRead, update: canEdit, readVersions: canEdit },
  versions: { drafts: { autosave: { interval: 2000 } }, max: 100 },
  fields: [...contentFields.map(field=>'name' in field?{...field,localized:true}:field), { name:'translationState',label:'État de traduction',type:'select',localized:true,options:['source','draft','reviewed','outdated'],defaultValue:'source' }, ...translationFields],
  hooks: { beforeChange:[({data,originalDoc,req})=>{ if(req.locale==='en'){ if(data.translationState==='reviewed')data.reviewedSourceRevision=originalDoc?.sourceRevision }else data.sourceRevision=contentRevision({...originalDoc,...data},contentFields.filter(f=>'name'in f).map(f=>(f as {name:string}).name)); return data }], afterRead:[({doc,req})=>{if(req.locale==='en'&&doc.reviewedSourceRevision!==doc.sourceRevision)doc.translationState='outdated';return doc}],afterChange:[async({doc,req})=>{await req.payload.create({collection:'audit-log',req,overrideAccess:true,data:{action:'update',collectionName:'site-content',documentID:'global',actor:req.user?.id||null,occurredAt:new Date().toISOString()}});return doc}] },
}
