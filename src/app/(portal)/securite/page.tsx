import type { Metadata } from 'next'
import { SecurityPanel } from '@/components/cms/security-panel'
import '../espace-client/portal.css'
export const metadata: Metadata = { title: 'Sécurité du compte — MIS', robots: { index: false, follow: false } }
export default function SecurityPage() { return <SecurityPanel /> }
