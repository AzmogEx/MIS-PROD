import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'same-origin' }
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body style={{ margin: 0 }}>{children}</body></html>
}
