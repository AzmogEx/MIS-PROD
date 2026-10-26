import { NextResponse } from 'next/server';
import { getCMS } from '@/cms/payload';
import { requireSameOrigin } from '@/cms/client-services';
import { abuseKey, getPublishedForm, readLimitedJSON, SubmissionError, submitBrief } from '@/cms/operations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const form = await getPublishedForm(await getCMS(), query.get('form') || 'brief-projet', query.get('locale') === 'en' ? 'en' : 'fr');
  return NextResponse.json(form ? { form } : { error: 'Formulaire indisponible.' }, { status: form ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ok:false,error:'Origine non autorisée.'},{status:403}); }
  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ ok: false, error: 'Format de requête invalide.' }, { status: 415 });
  if (Number(request.headers.get('content-length') ?? 0) > 64_000) return NextResponse.json({ ok: false, error: 'Le formulaire est trop volumineux.' }, { status: 413 });
  try {
    const body = await readLimitedJSON(request);
    const address = process.env.CMS_TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
    const result = await submitBrief(await getCMS(), {
      body, idempotencyKey: request.headers.get('x-idempotency-key') || '',
      rateKey: abuseKey(address, process.env.PAYLOAD_SECRET || 'local-rate-limiter'),
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SubmissionError) return NextResponse.json({ ok: false, error: error.message, fields: error.fields }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    console.error('[cms/contact] La réception durable a échoué.');
    return NextResponse.json({ ok: false, error: 'La demande n’a pas pu être enregistrée. Votre saisie est conservée ; veuillez réessayer.' }, { status: 503 });
  }
}
