import { renderPage } from '@/cms/render-page'
import { pageMetadata } from '@/cms/read'
export const dynamic = 'force-dynamic'
export const generateMetadata = () => pageMetadata('/entreprises')
export default function Page() { return renderPage('/entreprises') }
