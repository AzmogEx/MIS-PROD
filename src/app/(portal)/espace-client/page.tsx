import type { Metadata } from 'next'
import { ClientPortal } from '@/components/cms/client-portal'
import './portal.css'

export const metadata: Metadata = { title: 'Espace client — MIS', robots: { index: false, follow: false } }
export default function ClientPage() { return <ClientPortal /> }
