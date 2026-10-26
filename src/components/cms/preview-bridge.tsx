'use client'
import { useEffect } from 'react'
import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

export function PreviewBridge() {
  const router = useRouter()
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (window.parent === window) return
      const target = event.target as HTMLElement
      const block = target.closest<HTMLElement>('[data-cms-block]')
      const field = target.closest<HTMLElement>('[data-cms-field]')
      if (!block && !field) return
      event.preventDefault(); event.stopPropagation()
      window.parent.postMessage({ type: 'mis:select', block: block ? Number(block.dataset.cmsBlock) : null, field: field?.dataset.cmsField }, window.location.origin)
    }
    document.addEventListener('click', click, true)
    return () => document.removeEventListener('click', click, true)
  }, [])
  return <><RefreshRouteOnSave refresh={router.refresh} serverURL={typeof window === 'undefined' ? '' : window.location.origin} /><aside className="mis-preview-banner">Aperçu privé · Brouillon · Sélectionnez une section pour l’éditer</aside></>
}
