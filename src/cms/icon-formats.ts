import path from 'node:path'
import sharp from 'sharp'

export class IconFormatError extends Error { constructor(message: string, public status = 400) { super(message) } }
type IconFile = { data: Buffer; name: string; mimetype: string; size: number }
const fail = (message = 'Icône invalide ou format actif non autorisé. Exportez une image PNG si nécessaire.'): never => { throw new IconFormatError(message) }
const tags = new Set(['svg', 'g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'title', 'desc', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask'])
const numeric = new Set(['width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'offset', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'stroke-width', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset'])
const colors = new Set(['fill', 'stroke', 'stop-color', 'color'])

/** Accept a deliberately small static SVG language; never repair arbitrary XML. */
async function validateSVG(data: Buffer) {
  if (data.length > 262144) throw new IconFormatError('SVG limité à 256 Kio.', 413)
  let xml: string
  try { xml = new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/^\uFEFF/, '').trim() } catch { return fail('Le SVG doit être un document UTF-8 valide.') }
  xml = xml.replace(/^<\?xml version=["']1\.0["'](?: encoding=["']UTF-8["'])?\s*\?>\s*/i, '')
  if (/<!|<\?|\u0000/.test(xml)) fail()
  const stack: string[] = []; let roots = 0; let nodes = 0; let position = 0
  const tokens = /<[^>]*>/g; let match: RegExpExecArray | null
  const text = (value: string) => { if (value.trim() && !['title', 'desc'].includes(stack.at(-1) || '')) fail(); if (value.replace(/&(amp|lt|gt|quot|apos);/g, '').includes('&')) fail() }
  while ((match = tokens.exec(xml))) {
    text(xml.slice(position, match.index)); position = tokens.lastIndex
    const token = match[0]; if (++nodes > 5000) fail('SVG trop complexe : 5 000 éléments maximum.')
    const close = /^<\/([A-Za-z]+)\s*>$/.exec(token)
    if (close) { if (stack.pop() !== close[1]) fail(); continue }
    const start = /^<([A-Za-z]+)((?:\s[\s\S]*)?)\/?\s*>$/.exec(token)
    if (!start) return fail()
    if (!tags.has(start[1])) fail()
    const tag = start[1]; if (!stack.length) { if (tag !== 'svg' || ++roots !== 1) fail() } else if (tag === 'svg' || ['title', 'desc'].includes(stack.at(-1)!)) fail()
    const raw = start[2].replace(/\/\s*$/, ''); const attributes = new Set<string>(); let offset = 0
    const pattern = /\s+([A-Za-z][A-Za-z0-9-]*)\s*=\s*(["'])([^"'<>]*)\2/g; let attribute: RegExpExecArray | null
    while ((attribute = pattern.exec(raw))) {
      if (raw.slice(offset, attribute.index).trim()) fail(); offset = pattern.lastIndex
      const [, name, , value] = attribute
      if (attributes.has(name) || value.includes('&') || value.length > 65536) fail(); attributes.add(name)
      if (name === 'xmlns') { if (tag !== 'svg' || value !== 'http://www.w3.org/2000/svg') fail() }
      else if (name === 'id') { if (!/^[A-Za-z_][A-Za-z0-9_-]{0,100}$/.test(value)) fail() }
      else if (['role', 'aria-label', 'aria-hidden'].includes(name)) { if (!/^[\p{L}\p{N}\s.,_—–-]{1,300}$/u.test(value)) fail() }
      else if (numeric.has(name) || name === 'viewBox' || name === 'points') { if (!/^[+\-\d.eE%,\s]+$/.test(value)) fail() }
      else if (colors.has(name)) { if (!/^(#[\da-fA-F]{3,8}|[A-Za-z]{1,24}|url\(#[A-Za-z_][A-Za-z0-9_-]{0,100}\))$/.test(value)) fail() }
      else if (['clip-path', 'mask'].includes(name)) { if (!/^url\(#[A-Za-z_][A-Za-z0-9_-]{0,100}\)$/.test(value)) fail() }
      else if (name === 'd') { if (!/^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\s-]+$/.test(value)) fail() }
      else if (['transform', 'gradientTransform'].includes(name)) { if (!/^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([+\-\d.eE,\s]+\)\s*)+$/.test(value)) fail() }
      else {
        const enums: Record<string, string[]> = { 'fill-rule': ['nonzero', 'evenodd'], 'clip-rule': ['nonzero', 'evenodd'], 'stroke-linecap': ['butt', 'round', 'square'], 'stroke-linejoin': ['miter', 'round', 'bevel'], gradientUnits: ['userSpaceOnUse', 'objectBoundingBox'], clipPathUnits: ['userSpaceOnUse', 'objectBoundingBox'], maskUnits: ['userSpaceOnUse', 'objectBoundingBox'], maskContentUnits: ['userSpaceOnUse', 'objectBoundingBox'], spreadMethod: ['pad', 'reflect', 'repeat'], preserveAspectRatio: ['none', 'xMidYMid', 'xMidYMid meet', 'xMidYMid slice'] }
        if (!enums[name]?.includes(value)) fail()
      }
    }
    if (raw.slice(offset).trim()) fail()
    if (!/\/\s*>$/.test(token)) stack.push(tag)
    if (stack.length > 40) fail('SVG trop imbriqué.')
  }
  text(xml.slice(position)); if (stack.length || roots !== 1) fail()
  try {
    const image = sharp(data, { limitInputPixels: 16_777_216 }); const metadata = await image.metadata()
    if (metadata.format !== 'svg' || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) fail('Dimensions SVG invalides ou supérieures à 4 096 px.')
    await image.resize(32, 32, { fit: 'inside' }).png().toBuffer()
  } catch (error) { if (error instanceof IconFormatError) throw error; fail('Le SVG statique ne peut pas être décodé.') }
}

async function validateICO(data: Buffer) {
  if (data.length > 4 * 1024 * 1024) throw new IconFormatError('ICO limité à 4 Mio.', 413)
  if (data.length < 22 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) fail('En-tête ICO invalide.')
  const count = data.readUInt16LE(4); const directoryEnd = 6 + 16 * count
  if (!count || count > 32 || directoryEnd > data.length) fail('ICO : entre 1 et 32 images requises.')
  const spans: [number, number][] = []
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16; const width = data[entry] || 256; const height = data[entry + 1] || 256
    const length = data.readUInt32LE(entry + 8); const offset = data.readUInt32LE(entry + 12); const end = offset + length
    if (data[entry + 3] !== 0 || offset < directoryEnd || !length || end > data.length || spans.some(([a, b]) => offset < b && end > a)) fail('Entrée ICO hors limites ou superposée.')
    spans.push([offset, end]); const image = data.subarray(offset, end)
    if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      try { const decoder = sharp(image, { limitInputPixels: 65536 }); const metadata = await decoder.metadata(); if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height) fail('Dimensions PNG/ICO incohérentes.'); await decoder.raw().toBuffer() } catch (error) { if (error instanceof IconFormatError) throw error; fail('Image PNG interne à l’ICO invalide.') }
    } else {
      if (image.length < 40) fail('Image BMP interne à l’ICO invalide.')
      const header = image.readUInt32LE(0); const bpp = image.readUInt16LE(14)
      if (![40, 108, 124].includes(header) || header > image.length || image.readInt32LE(4) !== width || image.readInt32LE(8) !== height * 2 || image.readUInt16LE(12) !== 1 || ![1, 4, 8, 24, 32].includes(bpp) || image.readUInt32LE(16) !== 0) fail('Seuls les ICO PNG ou BMP non compressés sont acceptés.')
      const palette = bpp <= 8 ? (image.readUInt32LE(32) || 2 ** bpp) * 4 : 0
      const bitmap = Math.ceil(width * bpp / 32) * 4 * height; const mask = Math.ceil(width / 32) * 4 * height
      if (palette > 1024 || header + palette + bitmap + mask > image.length) fail('Données bitmap ICO incomplètes.')
    }
  }
  spans.sort((a, b) => a[0] - b[0]); if (spans[0][0] !== directoryEnd || spans.at(-1)![1] !== data.length || spans.some(([start], index) => index > 0 && start !== spans[index - 1][1])) fail('Données étrangères entre les images ICO.')
}

export async function validateIconFile(file: IconFile): Promise<boolean> {
  if (!['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.mimetype)) return false
  if (!Buffer.isBuffer(file.data) || !file.data.length || file.size !== file.data.length) fail('Icône vide ou incomplète.')
  if (file.mimetype === 'image/svg+xml') { if (path.extname(file.name).toLowerCase() !== '.svg') fail('Extension SVG requise.'); await validateSVG(file.data) }
  else { if (path.extname(file.name).toLowerCase() !== '.ico') fail('Extension ICO requise.'); await validateICO(file.data) }
  return true
}
