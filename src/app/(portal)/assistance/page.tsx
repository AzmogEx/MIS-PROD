import type { Metadata } from 'next'
import { AIAssistant } from '@/components/cms/client-portal'
import '../espace-client/portal.css'

export const metadata: Metadata = { title: 'Assistance éditoriale — MIS', robots: { index: false, follow: false } }
export default function AssistancePage() { return <AIAssistant /> }
