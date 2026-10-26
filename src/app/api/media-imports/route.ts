import { getCMS } from '@/cms/payload'
import { mediaImportHandlers } from '@/cms/media-import-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
const handlers = mediaImportHandlers(getCMS)
export const GET = handlers.GET
export const POST = handlers.POST
export const PUT = handlers.PUT
