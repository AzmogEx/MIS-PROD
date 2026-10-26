import type { Metadata } from 'next'
import { SecureLogin } from '@/components/cms/security-panel'
import '../espace-client/portal.css'
export const metadata: Metadata = { title: 'Connexion sécurisée — MIS', robots: { index: false, follow: false } }
export default function LoginPage() { return <SecureLogin /> }
