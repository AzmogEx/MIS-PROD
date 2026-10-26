import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { IconFormatError, validateIconFile } from '../src/cms/icon-formats'

const svg = (source: string) => ({ data: Buffer.from(source), name: 'logo.svg', mimetype: 'image/svg+xml', size: Buffer.byteLength(source) })
const valid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#c9a961" /></svg>'
const icon = (data: Buffer) => ({ data, name: 'favicon.ico', mimetype: 'image/x-icon', size: data.length })
test('les SVG et ICO historiques sont statiques, valides et conservés octet pour octet', async () => {
  for (const [filename, mimetype] of [['favicon.svg', 'image/svg+xml'], ['favicon.ico', 'image/x-icon']]) {
    const data = await readFile(`public/${filename}`); const before = Buffer.from(data)
    assert.equal(await validateIconFile({ data, name: filename, mimetype, size: data.length }), true); assert.deepEqual(data, before)
  }
  assert.equal(await validateIconFile(svg(valid)), true)
  assert.equal(await validateIconFile({ ...svg(valid), mimetype: 'image/png' }), false)
})
test('SVG : scripts, attributs actifs, XML, entités, styles et ressources externes refusés', async () => {
  const hostile = [
    '<script>alert(1)</script>', '<foreignObject><div>HTML</div></foreignObject>', '<image href="https://example.test/pixel" />', '<use href="https://example.test/evil.svg#x" />', '<style>rect{fill:url(https://example.test)}</style>', '<animate attributeName="href" values="javascript:alert(1)" />',
    '<rect onload="alert(1)" />', '<rect style="fill:red" />', '<rect fill="url(https://example.test)" />', '<rect fill="url(data:image/svg+xml;base64,AA)" />', '<rect fill="&#x72;ed" />', '<rect xlink:href="#x" />', '<rect xmlns:x="http://evil.test" />',
  ]
  for (const child of hostile) await assert.rejects(validateIconFile(svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${child}</svg>`)), IconFormatError)
  for (const source of ['<!DOCTYPE svg [<!ENTITY secret SYSTEM "file:///C:/secret">]>' + valid, '<?xml-stylesheet href="https://evil.test"?>' + valid, valid + valid, valid.replace('64 64', '999999 999999'), valid.replace('</svg>', ''), valid.replace('<rect', '<g><rect')]) await assert.rejects(validateIconFile(svg(source)), IconFormatError)
  await assert.rejects(validateIconFile({ ...svg(valid), name: 'logo.png' }), IconFormatError)
  await assert.rejects(validateIconFile(svg(`<svg>${' '.repeat(262144)}</svg>`)), (error: unknown) => error instanceof IconFormatError && error.status === 413)
})
test('ICO PNG : structure bornée, décodage réel, chevauchements et tailles falsifiées refusés', async () => {
  const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#c9a961' } }).png().toBuffer()
  const data = Buffer.alloc(22 + png.length); data.writeUInt16LE(1, 2); data.writeUInt16LE(1, 4); data[6] = 32; data[7] = 32; data.writeUInt16LE(1, 10); data.writeUInt16LE(32, 12); data.writeUInt32LE(png.length, 14); data.writeUInt32LE(22, 18); png.copy(data, 22)
  assert.equal(await validateIconFile(icon(data)), true)
  for (const alter of [(copy: Buffer) => copy.writeUInt32LE(1, 18), (copy: Buffer) => copy.writeUInt32LE(copy.length, 14), (copy: Buffer) => { copy[6] = 64 }, (copy: Buffer) => copy.writeUInt16LE(33, 4), (copy: Buffer) => { copy[22] = 0 }]) { const copy = Buffer.from(data); alter(copy); await assert.rejects(validateIconFile(icon(copy)), IconFormatError) }
  await assert.rejects(validateIconFile(icon(Buffer.concat([data, Buffer.from('<script>')]))), IconFormatError)
  const duplicate = Buffer.alloc(data.length + 16); data.copy(duplicate, 0, 0, 22); duplicate.writeUInt16LE(2, 4); duplicate.writeUInt32LE(38, 18); duplicate.set(duplicate.subarray(6, 22), 22); png.copy(duplicate, 38); await assert.rejects(validateIconFile(icon(duplicate)), IconFormatError)
})
