/** Container validation is bounded and does not decode video frames. Browser
 * playback remains a separate acceptance check. No subprocess or remote probe. */
export type VideoInspection = { container: 'mp4' | 'webm'; codecs: string[]; width: number; height: number; duration?: number; fastStart?: boolean }
const fail = (detail: string): never => { throw new Error(`Vidéo invalide ou non compatible : ${detail}`) }
type Box = { type: string; start: number; body: number; end: number }

export function inspectMP4(data: Buffer): VideoInspection {
  let count = 0
  const boxes = (start: number, end: number): Box[] => {
    const result: Box[] = []
    for (let at = start; at < end;) {
      if (++count > 20000 || at + 8 > end) fail('structure MP4 incomplète.')
      let size = data.readUInt32BE(at), header = 8
      const type = data.toString('ascii', at + 4, at + 8)
      if (size === 1) { if (at + 16 > end) fail('taille MP4 incomplète.'); const large = data.readBigUInt64BE(at + 8); if (large > BigInt(Number.MAX_SAFE_INTEGER)) fail('taille MP4 excessive.'); size = Number(large); header = 16 }
      if (size === 0) size = end - at
      if (size < header || at + size > end) fail('taille de bloc MP4 incohérente.')
      result.push({ type, start: at, body: at + header, end: at + size }); at += size
    }
    return result
  }
  const top = boxes(0, data.length), ftyp = top.find(box => box.type === 'ftyp'), movie = top.find(box => box.type === 'moov'), media = top.find(box => box.type === 'mdat')
  if (!ftyp || ftyp.body + 8 > ftyp.end || !movie || !media || media.body === media.end) fail('MP4 complet avec pistes et données requis.')
  const tracks = boxes(movie!.body, movie!.end).filter(box => box.type === 'trak')
  const codecs = new Set<string>(); let width = 0, height = 0, duration: number | undefined
  for (const track of tracks) {
    const mdia = boxes(track.body, track.end).find(box => box.type === 'mdia'); if (!mdia) continue
    const parts = boxes(mdia.body, mdia.end), handler = parts.find(box => box.type === 'hdlr'), header = parts.find(box => box.type === 'mdhd'), minf = parts.find(box => box.type === 'minf')
    if (!handler || handler.body + 12 > handler.end || !minf) fail('piste MP4 incomplète.')
    const kind = data.toString('ascii', handler!.body + 8, handler!.body + 12)
    if (!['vide', 'soun'].includes(kind)) continue
    const stbl = boxes(minf!.body, minf!.end).find(box => box.type === 'stbl'), stsd = stbl && boxes(stbl.body, stbl.end).find(box => box.type === 'stsd')
    if (!stsd || stsd.body + 8 > stsd.end) fail('description de codec absente.')
    const descriptions = boxes(stsd!.body + 8, stsd!.end)
    if (!descriptions.length || data.readUInt32BE(stsd!.body + 4) !== descriptions.length) fail('description de codec incohérente.')
    for (const sample of descriptions) {
      if (kind === 'vide') {
        if (!['avc1', 'avc3'].includes(sample.type)) fail('exportez le MP4 en H.264 (AVC), avec audio AAC si présent.')
        if (sample.body + 78 > sample.end) fail('description vidéo incomplète.')
        width = data.readUInt16BE(sample.body + 24); height = data.readUInt16BE(sample.body + 26)
        const avc = boxes(sample.body + 78, sample.end).find(box => box.type === 'avcC')
        if (!avc || avc.end - avc.body < 7 || data[avc.body] !== 1) fail('configuration H.264 absente.')
      } else if (sample.type !== 'mp4a') fail('exportez la piste audio MP4 en AAC.')
      codecs.add(sample.type)
    }
    if (kind === 'vide' && header) {
      const version = data[header.body], timeAt = header.body + (version === 1 ? 20 : 12), durationAt = timeAt + 4
      if (![0, 1].includes(version) || durationAt + (version === 1 ? 8 : 4) > header.end) fail('durée MP4 invalide.')
      const scale = data.readUInt32BE(timeAt), ticks = version === 1 ? Number(data.readBigUInt64BE(durationAt)) : data.readUInt32BE(durationAt)
      if (scale && Number.isSafeInteger(ticks) && ticks > 0) duration = ticks / scale
    }
  }
  if (!width || !height || width * height > 100_000_000 || !codecs.size) fail('aucune piste vidéo H.264 exploitable.')
  return { container: 'mp4', codecs: [...codecs], width, height, duration, fastStart: movie!.start < media!.start }
}

type Element = { id: number; body: number; end: number }
export function inspectWebM(data: Buffer): VideoInspection {
  let count = 0
  const elements = (start: number, end: number): Element[] => {
    const result: Element[] = []
    const vint = (at: number, id: boolean) => {
      if (at >= end || !data[at]) return fail('entier EBML incomplet.')
      let size = 1; while (!(data[at] & (0x80 >> (size - 1)))) size++
      if (size > (id ? 4 : 8) || at + size > end) return fail('entier EBML invalide.')
      let value = BigInt(id ? data[at] : data[at] & (0xff >> size))
      for (let i = 1; i < size; i++) value = value * BigInt(256) + BigInt(data[at + i])
      return { size, value, unknown: !id && value === (BigInt(1) << BigInt(7 * size)) - BigInt(1) }
    }
    for (let at = start; at < end;) {
      if (++count > 20000) fail('trop de blocs EBML.')
      const id = vint(at, true), size = vint(at + id.size, false), body = at + id.size + size.size
      const finish = size.unknown ? end : body + Number(size.value)
      if (!Number.isSafeInteger(finish) || finish > end || finish <= body) fail('taille EBML incohérente.')
      result.push({ id: Number(id.value), body, end: finish }); at = finish
    }
    return result
  }
  const top = elements(0, data.length), header = top.find(item => item.id === 0x1a45dfa3), segment = top.find(item => item.id === 0x18538067)
  const doc = header && elements(header.body, header.end).find(item => item.id === 0x4282)
  if (!doc || data.toString('ascii', doc.body, doc.end) !== 'webm' || !segment) fail('conteneur WebM requis.')
  const parts = elements(segment!.body, segment!.end), tracks = parts.find(item => item.id === 0x1654ae6b), cluster = parts.find(item => item.id === 0x1f43b675)
  if (!tracks || !cluster) fail('pistes et images WebM requises.')
  const codecs = new Set<string>(); let width = 0, height = 0
  const integer = (item?: Element) => { if (!item || item.end - item.body > 6) return 0; return data.readUIntBE(item.body, item.end - item.body) }
  for (const track of elements(tracks!.body, tracks!.end).filter(item => item.id === 0xae)) {
    const values = elements(track.body, track.end), type = integer(values.find(item => item.id === 0x83)), codec = values.find(item => item.id === 0x86)
    if (!codec) fail('codec WebM absent.')
    const name = data.toString('ascii', codec!.body, codec!.end)
    if (type === 1) {
      if (!['V_VP8', 'V_VP9', 'V_AV1'].includes(name)) fail('codec vidéo WebM non pris en charge.')
      const video = values.find(item => item.id === 0xe0); if (!video) fail('dimensions WebM absentes.')
      const dimensions = elements(video!.body, video!.end); width = integer(dimensions.find(item => item.id === 0xb0)); height = integer(dimensions.find(item => item.id === 0xba))
    } else if (type === 2 && !['A_OPUS', 'A_VORBIS'].includes(name)) fail('codec audio WebM non pris en charge.')
    else if (type !== 2) continue
    codecs.add(name)
  }
  if (!width || !height || width * height > 100_000_000) fail('aucune piste vidéo WebM exploitable.')
  return { container: 'webm', codecs: [...codecs], width, height }
}

export function inspectVideo(data: Buffer, mimeType: string) { return mimeType === 'video/mp4' ? inspectMP4(data) : inspectWebM(data) }
