import '../globals.css'
import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/jetbrains-mono'
import '@/components/cms/editor.css'
export const metadata = { title: 'MIS — Atelier', robots: { index: false, follow: false } }
export default function StudioLayout({ children }: { children: React.ReactNode }) { return <html lang="fr"><body className="mis-studio">{children}</body></html> }
