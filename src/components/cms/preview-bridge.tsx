'use client'
import { useEffect } from 'react'

export function PreviewBridge() {
  useEffect(() => {
    let selectedElement: HTMLElement | null = null
    const click = (event: MouseEvent) => {
      if (window.parent === window) return
      const target = event.target as HTMLElement
      let block = target.closest<HTMLElement>('[data-cms-block]')
      while (block) {
        const parent = block.parentElement?.closest<HTMLElement>('[data-cms-block]')
        if (!parent) break
        block = parent
      }
      const field = target.closest<HTMLElement>('[data-cms-field]')
      const path = target.closest<HTMLElement>('[data-cms-path]')
      if (!block && !field && !path) return
      event.preventDefault(); event.stopPropagation()
      selectedElement?.classList.remove('mis-preview-selected')
      selectedElement = path || field || block
      selectedElement?.classList.add('mis-preview-selected')
      window.parent.postMessage({ type: 'mis:select', block: block ? Number(block.dataset.cmsBlock) : null, field: field?.dataset.cmsField, path: path?.dataset.cmsPath }, window.location.origin)
    }
    document.addEventListener('click', click, true)
    return () => { document.removeEventListener('click', click, true); selectedElement?.classList.remove('mis-preview-selected') }
  }, [])
  return <aside className="mis-preview-banner">Aperçu privé · Cliquez sur une section pour la modifier</aside>
}
