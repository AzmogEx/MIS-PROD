import { getCMS } from '@/cms/payload'
import { clientFileHandlers } from '@/cms/client-file-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return clientFileHandlers(getCMS).file(request, (await context.params).id)
}

export const HEAD = GET
