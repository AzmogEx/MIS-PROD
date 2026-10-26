/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from 'react'
import type { ImageImportEdits } from '@/cms/media-image-edits'

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))
export function ImageImportEditor({ file, confirm, cancel }: { file: File; confirm: (edits: ImageImportEdits) => void; cancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [source] = useState(() => URL.createObjectURL(file))
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 })
  const [edits, setEdits] = useState<ImageImportEdits>({ focalX: 50, focalY: 50 })
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close(); URL.revokeObjectURL(source) } }, [source])
  const keepPointInside = (next: ImageImportEdits) => ({ ...next, focalX: clamp(next.focalX, next.crop?.x || 0, next.crop ? next.crop.x + next.crop.width : 100), focalY: clamp(next.focalY, next.crop?.y || 0, next.crop ? next.crop.y + next.crop.height : 100) })
  const cropValue = (name: 'x' | 'y' | 'width' | 'height', value: number) => setEdits(previous => {
    const crop = { ...(previous.crop || { x: 0, y: 0, width: 100, height: 100 }), [name]: value }
    crop.x = clamp(crop.x, 0, 100 - crop.width); crop.y = clamp(crop.y, 0, 100 - crop.height)
    return keepPointInside({ ...previous, crop })
  })
  const ratio = (value: string) => {
    if (!value) return
    const aspect = Number(value); const width = Math.min(100, 100 * aspect * dimensions.height / dimensions.width); const height = Math.min(100, 100 * dimensions.width / (aspect * dimensions.height))
    setEdits(previous => keepPointInside({ ...previous, crop: { x: (100 - width) / 2, y: (100 - height) / 2, width, height } }))
  }
  return <dialog ref={dialog} className="mi-dialog" onCancel={event => { event.preventDefault(); cancel() }} aria-labelledby="image-import-title">
    <style>{`.mi-dialog{width:min(980px,94vw);max-height:92vh;overflow:auto;margin:auto;border:1px solid #85754b;border-radius:12px;padding:26px;background:#171d13;color:#f2f0e6;font:15px/1.5 Arial,sans-serif}.mi-dialog::backdrop{background:#000b}.mi-dialog h2{font:30px Georgia,serif;margin:0 0 8px}.mi-dialog p{color:#c5c9ba}.mi-editor-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:26px;align-items:start}.mi-canvas{position:relative;display:block;width:100%;padding:0;overflow:hidden;max-height:58vh;background:#090c07;border:1px solid #5b624a;cursor:crosshair}.mi-canvas img{display:block;width:100%;height:100%;object-fit:contain}.mi-crop{position:absolute;border:2px solid #e6c57b;box-shadow:0 0 0 9999px #0008;pointer-events:none}.mi-point{position:absolute;width:20px;height:20px;border:2px solid white;border-radius:50%;transform:translate(-50%,-50%);background:#d4af5c;box-shadow:0 0 0 2px #161c10;pointer-events:none}.mi-controls{display:grid;gap:15px}.mi-controls label{display:grid;gap:6px;color:#e6e5d8;font-size:13px}.mi-controls input[type=range]{width:100%;accent-color:#ddc180}.mi-controls select{padding:10px;background:#22291b;color:inherit;border:1px solid #626a51}.mi-controls .mi-check{display:flex;gap:9px;align-items:center}.mi-dialog footer{display:flex;justify-content:flex-end;gap:14px;margin-top:24px}.mi-dialog button:not(.mi-canvas){min-height:44px;padding:10px 16px;border:1px solid #87764c;border-radius:5px;background:#2b3322;color:#f2f0e6;cursor:pointer}.mi-dialog button[type=submit]{background:#d1b36e;color:#10160b}.mi-dialog :focus-visible{outline:2px solid #f3d890;outline-offset:3px}.mi-dialog small{display:block;color:#bfc6b2}@media(max-width:700px){.mi-editor-grid{grid-template-columns:1fr}.mi-dialog{padding:18px}.mi-canvas{max-height:none}}`}</style>
    <form onSubmit={event => { event.preventDefault(); confirm(edits) }}>
      <h2 id="image-import-title">Cadrage et point focal</h2><p>{file.name}</p>
      <div className="mi-editor-grid"><div><button type="button" className="mi-canvas" style={{ aspectRatio: dimensions.width / dimensions.height, maxWidth: `${58 * dimensions.width / dimensions.height}vh`, marginInline: 'auto' }} aria-label="Cliquer dans l’image pour choisir le point focal ; les curseurs permettent le même réglage au clavier." onClick={event => { if (!event.detail) return; const rectangle = event.currentTarget.getBoundingClientRect(); setEdits(previous => keepPointInside({ ...previous, focalX: clamp((event.clientX - rectangle.left) / rectangle.width * 100), focalY: clamp((event.clientY - rectangle.top) / rectangle.height * 100) })) }}>
        <img src={source} alt="Aperçu de l’image à importer" onLoad={event => { setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setLoaded(true) }} onError={() => setError('Cette image ne peut pas être prévisualisée. Choisissez une image JPEG, PNG, WebP ou AVIF valide.')} />
        {edits.crop && <span className="mi-crop" style={{ left: `${edits.crop.x}%`, top: `${edits.crop.y}%`, width: `${edits.crop.width}%`, height: `${edits.crop.height}%` }} />}
        <span className="mi-point" style={{ left: `${edits.focalX}%`, top: `${edits.focalY}%` }} />
      </button><small>Le point focal guide les variantes web. Un recadrage crée une image dérivée et conserve la source complète, en diffusion restreinte.</small>{error && <p role="alert">{error}</p>}</div>
      <div className="mi-controls"><label>Point focal horizontal · {Math.round(edits.focalX)} %<input type="range" min={edits.crop?.x || 0} max={edits.crop ? edits.crop.x + edits.crop.width : 100} step="1" value={edits.focalX} onChange={event => setEdits(previous => ({ ...previous, focalX: Number(event.target.value) }))} /></label><label>Point focal vertical · {Math.round(edits.focalY)} %<input type="range" min={edits.crop?.y || 0} max={edits.crop ? edits.crop.y + edits.crop.height : 100} step="1" value={edits.focalY} onChange={event => setEdits(previous => ({ ...previous, focalY: Number(event.target.value) }))} /></label>
        <label className="mi-check"><input type="checkbox" checked={Boolean(edits.crop)} onChange={event => setEdits(previous => ({ ...previous, crop: event.target.checked ? { x: 0, y: 0, width: 100, height: 100 } : undefined }))} /> Créer un recadrage</label>
        {edits.crop && <><label>Format de départ<select defaultValue="" onChange={event => ratio(event.target.value)}><option value="">Libre</option><option value={16 / 9}>Paysage 16:9</option><option value={4 / 3}>Paysage 4:3</option><option value="1">Carré</option><option value={9 / 16}>Portrait 9:16</option></select></label>{(['width', 'height', 'x', 'y'] as const).map(name => <label key={name}>{({ width: 'Largeur', height: 'Hauteur', x: 'Position horizontale', y: 'Position verticale' })[name]} · {Math.round(edits.crop![name])} %<input type="range" min={name === 'width' || name === 'height' ? 5 : 0} max={name === 'x' ? 100 - edits.crop!.width : name === 'y' ? 100 - edits.crop!.height : 100} step="1" value={edits.crop![name]} onChange={event => cropValue(name, Number(event.target.value))} /></label>)}<small>Résultat : environ {Math.round(dimensions.width * edits.crop.width / 100)} × {Math.round(dimensions.height * edits.crop.height / 100)} px</small></>}
      </div></div>
      <footer><button type="button" onClick={cancel}>Annuler cet import</button><button type="submit" disabled={Boolean(error) || !loaded}>Importer avec ces réglages</button></footer>
    </form>
  </dialog>
}
