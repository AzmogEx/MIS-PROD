import type { Metadata } from 'next'
import { SmoothScroll } from '@/components/providers/smooth-scroll'
import { Navbar } from '@/components/site/navbar'
import { Footer } from '@/components/site/footer'
import { SiteContentProvider } from '@/components/cms/content-context'
import { readSiteContent } from '@/cms/read'
import { GlobalAppearance } from '@/components/cms/global-appearance'
import { PublicAnalytics } from '@/components/cms/public-analytics'
import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/jetbrains-mono'
import '../globals.css'
import '@/components/cms/editor.css'

export async function generateMetadata(): Promise<Metadata> {
  const { site, identity } = await readSiteContent()
  return { title: { default: `${site.name} — Studio de production audiovisuelle premium`, template: `%s — ${site.name}` }, description: site.tagline, metadataBase: new URL(site.url), icons: { icon: identity.favicon, shortcut: identity.shortcutIcon, apple: identity.appleIcon }, openGraph: { title: site.name, description: site.tagline, locale: 'fr_FR', type: 'website', siteName: site.name, images: [identity.shareImage || '/opengraph-image'] }, twitter: { card: 'summary_large_image', title: site.name, description: site.tagline } }
}
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ path?: string[] }> }) {
  const locale = (await params).path?.[0] === 'en' ? 'en' : 'fr'
  const content = await readSiteContent(false, locale)
  return <html lang={locale} className="antialiased"><body className="min-h-screen bg-background text-foreground"><SiteContentProvider content={content}><GlobalAppearance content={content}><PublicAnalytics><SmoothScroll><Navbar />{children}<Footer /></SmoothScroll></PublicAnalytics></GlobalAppearance></SiteContentProvider></body></html>
}
