import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { mediaLimits } from '../src/cms/media-services'

const formats: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4' }
type ImportReport = { imported: { source: string; id: number | string; sha256: string; bytes: number }[]; existing: { source: string; id: number | string }[]; skipped: { source: string; reason: string }[]; failed: { source: string; error: string }[]; limitations: string[] }

/** Copies existing public originals; never rewrites editorial references or source files. */
export async function importPublicMedia(payload: Payload, publicDirectory = path.resolve('public')): Promise<ImportReport> {
  const root = path.resolve(publicDirectory)
  const report: ImportReport = {
    imported: [], existing: [], skipped: [], failed: [],
    limitations: [
      'Les adresses statiques dans public restent accessibles et inchangées. Restreindre la copie CMS ne retire pas ces originaux statiques.',
      'Aucune référence éditoriale, aucun global ni aucune page ne sont modifiés. Les anciens chemins statiques ne sont pas automatiquement associés aux copies CMS.',
      'Origine et droits non vérifiés : la diffusion publique reprend uniquement le statut déjà public des fichiers du dépôt.',
      'SVG et ICO sont conservés à leur emplacement public et exclus de cet import ; le téléversement CMS reste limité aux formats contrôlés.',
    ],
  }
  const visit = async (directory: string): Promise<string[]> => {
    const files: string[] = []
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) files.push(...await visit(fullPath))
      else if (entry.isFile()) files.push(fullPath)
      else report.skipped.push({ source: path.relative(root, fullPath).replaceAll('\\', '/'), reason: 'Lien symbolique ou type de fichier non régulier ignoré.' })
    }
    return files
  }
  for (const filePath of await visit(root)) {
    const relative = path.relative(root, filePath).replaceAll('\\', '/')
    const source = `/${relative}`
    const mimetype = formats[path.extname(filePath).toLowerCase()]
    if (!mimetype) { report.skipped.push({ source, reason: 'Format exclu de l’import des originaux image et MP4.' }); continue }
    try {
      const info = await stat(filePath)
      if (info.size > mediaLimits().maxFileBytes) throw new Error('Fichier au-delà de MEDIA_MAX_BYTES ; original statique conservé.')
      const data = await readFile(filePath)
      const sha256 = createHash('sha256').update(data).digest('hex')
      const sourceKey = `legacy-public:${relative}:sha256:${sha256}`
      const existing = await payload.find({ collection: 'media', where: { sourceKey: { equals: sourceKey } }, limit: 1, depth: 0, overrideAccess: true })
      if (existing.docs.length) { report.existing.push({ source, id: existing.docs[0].id }); continue }
      const document = await payload.create({
        collection: 'media', overrideAccess: true,
        file: { data, name: path.basename(filePath), mimetype, size: data.length },
        data: {
          sourceKey, alt: `Import historique — ${path.basename(filePath, path.extname(filePath)).replaceAll('-', ' ')}`,
          collection: 'Site historique / fichiers publics', tags: ['import-historique', 'droits-a-verifier'], visibility: 'public', language: 'fr',
          credit: `Origine : ${source}. Attribution à confirmer.`,
          authorization: `Copie du fichier déjà public dans le dépôt : ${source}. Empreinte SHA-256 : ${sha256}. Droits de diffusion non vérifiés. La copie CMS reprend sa visibilité publique existante ; l’original statique reste accessible tant qu’il est dans public.`,
        },
      })
      report.imported.push({ source, id: document.id, sha256, bytes: data.length })
    } catch (error) { report.failed.push({ source, error: error instanceof Error ? error.message : 'Import impossible.' }) }
  }
  return report
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/cms-import-media.ts')) {
  const { getCMS } = await import('../src/cms/payload')
  const payload = await getCMS()
  try {
    const report = await importPublicMedia(payload)
    console.log(JSON.stringify(report, null, 2))
    if (report.failed.length) process.exitCode = 1
  } finally { await payload.destroy() }
}
