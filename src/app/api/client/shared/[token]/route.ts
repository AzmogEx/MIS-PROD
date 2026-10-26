import { getCMS } from '@/cms/payload'
import { clientFileHandlers } from '@/cms/client-file-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return clientFileHandlers(getCMS).shared(request, (await context.params).token)
}
export const HEAD = GET
