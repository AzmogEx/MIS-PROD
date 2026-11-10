'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'

type UserWithRole = { role?: string } | null | undefined

export function SimpleNavigation() {
  const { user } = useAuth()
  const pathname = usePathname() || ''
  const role = (user as UserWithRole)?.role
  const canEdit = ['owner', 'admin', 'editor'].includes(String(role))
  const canSell = ['owner', 'admin', 'sales'].includes(String(role))
  const links = [
    { label: 'Accueil', href: '/admin', show: true },
    { label: 'Modifier le site', href: '/admin/collections/pages', show: canEdit },
    { label: 'Photos', href: '/admin/collections/media', show: canEdit },
    { label: 'Demandes', href: '/admin/collections/briefs', show: canSell },
  ].filter((link) => link.show)

  return <nav className="mis-simple-nav" aria-label="Navigation principale">
    {links.map(({ label, href }) => {
      const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)) || (href === '/admin/collections/pages' && pathname.startsWith('/atelier/'))
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>{label}</Link>
    })}
  </nav>
}
