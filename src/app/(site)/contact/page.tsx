import { renderPage } from '@/cms/render-page'
import { pageMetadata } from '@/cms/read'
export const dynamic = 'force-dynamic'
export const generateMetadata = () => pageMetadata('/contact')
export default function Page() { return renderPage('/contact') }
