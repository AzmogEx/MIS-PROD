import { renderPage } from '@/cms/render-page'
import { pageMetadata } from '@/cms/read'
export const dynamic = 'force-dynamic'
type Args = { params: Promise<{ path: string[] }> }
function resolve(parts: string[]) { const en = parts[0] === 'en'; return { path: '/' + (en ? parts.slice(1) : parts).join('/'), locale: en ? 'en' as const : 'fr' as const } }
export async function generateMetadata({ params }: Args) { const route = resolve((await params).path); return pageMetadata(route.path, route.locale) }
export default async function Page({ params }: Args) { const route = resolve((await params).path); return renderPage(route.path, route.locale) }
