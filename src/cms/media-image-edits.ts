import sharp from 'sharp'
import path from 'node:path'
import { MediaError } from './media-services'

export type ImageImportEdits = { focalX: number; focalY: number; crop?: { x: number; y: number; width: number; height: number } }

export function normalizeImageEdits(value: unknown, type: string): ImageImportEdits | undefined {
  if (value == null) return undefined
  if (!type.startsWith('image/') || typeof value !== 'object' || Array.isArray(value)) throw new MediaError('Le cadrage est réservé aux images.')
  const input = value as Record<string, unknown>
  const number = (value: unknown, minimum = 0) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 100) throw new MediaError('Les coordonnées du cadrage doivent être comprises entre 0 et 100 %.')
    return Math.round(value * 1000) / 1000
  }
  const result: ImageImportEdits = { focalX: number(input.focalX), focalY: number(input.focalY) }
  if (input.crop != null) {
    if (typeof input.crop !== 'object' || Array.isArray(input.crop)) throw new MediaError('Zone de recadrage invalide.')
    const crop = input.crop as Record<string, unknown>
    result.crop = { x: number(crop.x), y: number(crop.y), width: number(crop.width, .1), height: number(crop.height, .1) }
    if (result.crop.x + result.crop.width > 100.0001 || result.crop.y + result.crop.height > 100.0001) throw new MediaError('Le recadrage dépasse les bords de l’image.')
    if (result.crop.x === 0 && result.crop.y === 0 && result.crop.width === 100 && result.crop.height === 100) delete result.crop
  }
  return result.focalX === 50 && result.focalY === 50 && !result.crop ? undefined : result
}

/** Derive a new image; the received source buffer is never mutated. Coordinates follow EXIF orientation. */
export async function cropImportImage(data: Buffer, name: string, type: string, edits: ImageImportEdits) {
  if (!edits.crop) return null
  const image = sharp(data, { limitInputPixels: 100_000_000, animated: false })
  const metadata = await image.metadata()
  if ((metadata.pages || 1) > 1) throw new MediaError('Le recadrage des images animées exige une source fixe. L’original animé reste inchangé.')
  const width = metadata.autoOrient.width; const height = metadata.autoOrient.height
  const crop = edits.crop
  const left = Math.min(width - 1, Math.round(width * crop.x / 100)); const top = Math.min(height - 1, Math.round(height * crop.y / 100))
  const targetWidth = Math.max(1, Math.min(width - left, Math.round(width * crop.width / 100))); const targetHeight = Math.max(1, Math.min(height - top, Math.round(height * crop.height / 100)))
  const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as const
  const format = formats[type as keyof typeof formats]
  if (!format) throw new MediaError('Format d’image non pris en charge pour le recadrage.')
  const output = await image.autoOrient().extract({ left, top, width: targetWidth, height: targetHeight }).toFormat(format, { quality: 92 }).toBuffer()
  const clamp = (value: number) => Math.min(100, Math.max(0, value))
  return { data: output, name: `${path.basename(name, path.extname(name))}-recadrage${path.extname(name)}`, mimetype: type, size: output.length, focalX: clamp((edits.focalX - crop.x) / crop.width * 100), focalY: clamp((edits.focalY - crop.y) / crop.height * 100), width: targetWidth, height: targetHeight }
}
