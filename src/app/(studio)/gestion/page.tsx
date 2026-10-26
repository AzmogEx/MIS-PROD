import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCMS } from '@/cms/payload';
import { hasRole } from '@/cms/access';
import { getOperationsSnapshot } from '@/cms/operations';
import { OperationsDashboard } from '@/components/cms/operations-dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demandes et pilotage — MIS', robots: { index: false, follow: false } };

export default async function OperationsPage() {
  const payload = await getCMS();
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) redirect('/admin/login?redirect=%2Fgestion');
  if (!hasRole(user, ['owner', 'admin', 'sales'])) redirect('/admin');
  const snapshot = await getOperationsSnapshot(payload, user, new URLSearchParams());
  return <OperationsDashboard initial={snapshot} />;
}
