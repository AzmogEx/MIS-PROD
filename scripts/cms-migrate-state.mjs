import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'

/** A manual SQL migration needs its final schema snapshot before code generation. */
export async function requireLatestMigrationSnapshot(directory) {
  const files = await readdir(directory)
  const last = files.filter(file => /^\d{8}_\d{6}_.+\.ts$/.test(file)).sort().at(-1)
  if (!last) return null
  const snapshot = last.replace(/\.ts$/, '.json')
  if (!files.includes(snapshot)) throw new Error(`Génération refusée : ${last} ne possède pas de snapshot Drizzle. Réconciliez le schéma final des migrations manuelles dans un environnement isolé avant de générer ; aucune base ne sera modifiée.`)
  const value = JSON.parse(await readFile(path.join(directory, snapshot), 'utf8'))
  if (value.dialect !== 'sqlite' || !value.tables || !value.version) throw new Error('Snapshot Drizzle final invalide : génération refusée.')
  return snapshot
}
