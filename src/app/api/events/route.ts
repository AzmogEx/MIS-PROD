import { NextResponse } from 'next/server';
import { getCMS } from '@/cms/payload';
import { abuseKey, readLimitedJSON, recordBrowserEvent, SubmissionError } from '@/cms/operations';
import { requireSameOrigin } from '@/cms/client-services';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (process.env.CMS_BROWSER_ANALYTICS !== 'enabled') return new NextResponse(null, { status: 204 });
  try { requireSameOrigin(request); if (!request.headers.get('origin')) throw new Error('Origine absente.'); }
  catch { return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } }); }
  try {
    const data = await readLimitedJSON(request, 1000);
    const address = process.env.CMS_TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
    await recordBrowserEvent(await getCMS(), data, abuseKey(address, process.env.PAYLOAD_SECRET || 'local-rate-limiter'));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SubmissionError ? error.message : 'Mesure indisponible.' }, { status: error instanceof SubmissionError ? error.status : 503 });
  }
}
