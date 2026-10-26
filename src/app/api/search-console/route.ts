import { getCMS } from '@/cms/payload'
import { requireSameOrigin } from '@/cms/client-services'
import { readLimitedJSON } from '@/cms/operations'
import { readSearchConsole, syncSearchConsole, SearchConsoleError } from '@/cms/search-console'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  try { const cms = await getCMS(), { user } = await cms.auth({ headers: request.headers }); return Response.json(await readSearchConsole(cms, user), { headers }) }
  catch (error) { return Response.json({ error: error instanceof SearchConsoleError ? error.message : 'Observation indisponible.' }, { status: error instanceof SearchConsoleError ? error.status : 503, headers }) }
}
export async function POST(request: Request) {
  try { requireSameOrigin(request) } catch { return Response.json({ error: 'Origine refusée.' }, { status: 403, headers }) }
  try {
    const cms = await getCMS(), { user } = await cms.auth({ headers: request.headers })
    const input = await readLimitedJSON(request, 2048) as { from?: unknown; to?: unknown }
    return Response.json(await syncSearchConsole(cms, user, input), { headers })
  } catch (error) { return Response.json({ error: error instanceof SearchConsoleError ? error.message : 'Synchronisation indisponible.' }, { status: error instanceof SearchConsoleError ? error.status : 503, headers }) }
}
