import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import sharp from 'sharp'
import { coreCollections, siteContent } from './cms/collections'
import { operationCollections } from './cms/operation-collections'
import { clientCollections } from './cms/client-collections'
import { aiCollections, aiSettings } from './cms/ai'
import { misAuthEmail } from './cms/auth-email'
import { installTransactionQueue } from './cms/transaction-queue'
import { canManage } from './cms/access'

mkdirSync(path.resolve('.data'), { recursive: true })
const secret = process.env.PAYLOAD_SECRET
if (!secret || secret.length < 32) throw new Error('PAYLOAD_SECRET doit contenir au moins 32 caractères. Lancez npm run cms:setup en local.')

export default buildConfig({
  onInit: installTransactionQueue,
  secret,
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  admin: {
    user: 'users', meta: { titleSuffix: ' — MIS Administration' },
    importMap: { baseDir: path.resolve('.') },
    components: { beforeDashboard: ['/src/components/cms/dashboard#Dashboard'],graphics:{Logo:'/src/components/cms/brand#MISLogo',Icon:'/src/components/cms/brand#MISIcon'} },
    livePreview: { collections: ['pages'] },
  },
  i18n: { supportedLanguages: { fr }, fallbackLanguage: 'fr' },
  localization: { locales: [{ label: 'Français', code: 'fr' }, { label: 'English', code: 'en' }], defaultLocale: 'fr', fallback: true },
  collections: [...coreCollections, ...operationCollections, ...clientCollections, ...aiCollections],
  globals: [siteContent, aiSettings],
  editor: lexicalEditor(),
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URL || 'file:./.data/cms.db' }, push: process.env.NODE_ENV !== 'production' && process.env.CMS_SCHEMA_PUSH === 'true', busyTimeout: 10000, wal: true, transactionOptions: { behavior: 'immediate' } }),
  sharp,
  upload: { limits: { fileSize: Number(process.env.MEDIA_MAX_BYTES || 100 * 1024 * 1024) }, abortOnLimit: true },
  typescript: { outputFile: path.resolve('src/payload-types.ts'), autoGenerate: false },
  graphQL: { disable: true },
  jobs: {
    deleteJobOnComplete: false, access: { run: ({ req }) => req.user?.role === 'owner' || req.user?.role === 'admin' }, tasks: [],
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: { ...defaultJobsCollection.access, read: canManage },
      admin: { ...defaultJobsCollection.admin, hidden: false, group: 'Exploitation', defaultColumns: ['taskSlug', 'waitUntil', 'processing', 'hasError', 'completedAt'], description: 'Lecture des traitements persistants. Une publication interrompue exige de vérifier son contenu et son historique avant une nouvelle programmation.' },
    }),
  },
  telemetry: false,
  email: misAuthEmail(),
})
