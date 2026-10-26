import { getCMS } from '@/cms/payload';
import { requireSameOrigin } from '@/cms/client-services';
import { hasRole } from '@/cms/access';
import { getOperationsSnapshot, mutateOperation, operationsCSV, readLimitedJSON, SubmissionError } from '@/cms/operations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: Request) {
  const payload = await getCMS();
  const { user } = await payload.auth({ headers: request.headers });
  if (!hasRole(user, ['owner', 'admin', 'sales'])) return Response.json({ error: 'Accès commercial requis.' }, { status: user ? 403 : 401, headers });
  try {
    const params = new URL(request.url).searchParams;
    if (params.get('export') === 'csv') {
      const csv = await operationsCSV(payload, user, params);
      return new Response(csv, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="mis-demandes.csv"' } });
    }
    return Response.json(await getOperationsSnapshot(payload, user, params), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof SubmissionError ? error.message : 'Lecture indisponible.' }, { status: error instanceof SubmissionError ? error.status : 503, headers });
  }
}

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({error:'Origine non autorisée.'},{status:403,headers}); }
  const payload = await getCMS();
  const { user } = await payload.auth({ headers: request.headers });
  if (!hasRole(user, ['owner', 'admin', 'sales'])) return Response.json({ error: 'Accès commercial requis.' }, { status: user ? 403 : 401, headers });
  try {
    const data = await readLimitedJSON(request, 16000);
    await mutateOperation(payload, user, data);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof SubmissionError ? error.message : error instanceof Error && /transition|reprise|notification/.test(error.message) ? error.message : 'Action non enregistrée. Vérifiez les champs et vos droits.' }, { status: error instanceof SubmissionError ? error.status : 400, headers });
  }
}
