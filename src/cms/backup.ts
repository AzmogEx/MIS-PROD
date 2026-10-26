import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, copyFile, readFile, writeFile, stat, realpath, lstat } from 'node:fs/promises'

type BackupFile={path:string;bytes:number;sha256:string}
const inside=(root:string,target:string)=>{const relative=path.relative(root,target);return !relative.startsWith('..')&&!path.isAbsolute(relative)}
async function storageRoot(base:string){
  const workspace=path.resolve(process.cwd()),absolute=path.resolve(base)
  if(!inside(workspace,absolute))throw new Error('Le stockage externe nécessite une sauvegarde fournisseur dédiée.')
  if(inside(absolute,path.resolve('.data/backups'))||inside(absolute,path.resolve('.data/restore-checks')))throw new Error('Stockage trop large : les sauvegardes et restaurations ne doivent pas être incluses dans leur propre source.')
  try { if((await lstat(absolute)).isSymbolicLink()||!inside(await realpath(workspace),await realpath(absolute)))throw new Error('Sauvegarde interrompue : racine de stockage liée hors périmètre ou symbolique.') }
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  return absolute
}
async function filesUnder(directory:string,skipLocks=false):Promise<string[]> {
  let entries;try{entries=await readdir(directory,{withFileTypes:true})}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error}
  const paths:string[]=[]
  for(const entry of entries){if(skipLocks&&entry.name.endsWith('.lock'))continue;if(entry.isSymbolicLink())throw new Error('Sauvegarde interrompue : lien symbolique non pris en charge.');const full=path.join(directory,entry.name);if(entry.isDirectory())paths.push(...await filesUnder(full,skipLocks));else if(entry.isFile())paths.push(full)}
  return paths
}
export async function backupAndVerify() {
  const url=process.env.DATABASE_URL||'file:./.data/cms.db'
  if(!url.startsWith('file:'))throw new Error('Cette commande de sauvegarde est réservée à SQLite local.')
  const dbPath=path.resolve(url.slice(5));await stat(dbPath)
  const bases=await Promise.all([process.env.CMS_MEDIA_DIR||'.data/media',process.env.CMS_PRIVATE_FILES_DIR||'.cms/private',process.env.CMS_BRIEF_FILES_DIR||'.data/brief-files',process.env.MEDIA_IMPORT_ROOT||'.data/media-imports','.data/retention-archives',process.env.CMS_SEARCH_CONSOLE_DIR||'.data/search-console','public','.data/mailbox'].map(storageRoot))
  const stamp=new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8)
  const root=path.resolve('.data/backups',stamp);await mkdir(root,{recursive:true})
  const db=new DatabaseSync(dbPath)
  try{db.exec(`VACUUM INTO '${path.join(root,'cms.db').replaceAll("'","''")}'`)}finally{db.close()}
  const databaseBytes=await readFile(path.join(root,'cms.db'))
  const database={bytes:databaseBytes.length,sha256:createHash('sha256').update(databaseBytes).digest('hex')}
  const manifest:BackupFile[]=[]
  for(const absoluteBase of bases) {
    const files=await filesUnder(absoluteBase,[process.env.MEDIA_IMPORT_ROOT||'.data/media-imports',process.env.CMS_BRIEF_FILES_DIR||'.data/brief-files'].some(root=>absoluteBase===path.resolve(root)))
    for(const file of files){const relative=path.relative(process.cwd(),file);if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Le stockage externe nécessite une sauvegarde fournisseur dédiée.');const dest=path.join(root,'files',relative);await mkdir(path.dirname(dest),{recursive:true});await copyFile(file,dest);const bytes=await readFile(dest);manifest.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
  }
  const configuration:(BackupFile&{archivePath:string})[]=[]
  for(const config of ['.env.local','.env.example','package-lock.json','src/payload.config.ts']) {
    try{const archivePath=config.replaceAll('/','_'),dest=path.join(root,'configuration',archivePath);await mkdir(path.dirname(dest),{recursive:true});await copyFile(config,dest);const bytes=await readFile(dest);configuration.push({path:config,archivePath,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  }
  const restore=path.resolve('.data/restore-checks',stamp);await mkdir(restore,{recursive:true});await copyFile(path.join(root,'cms.db'),path.join(restore,'cms.db'))
  if(createHash('sha256').update(await readFile(path.join(restore,'cms.db'))).digest('hex')!==database.sha256)throw new Error('Empreinte de base restaurée incohérente.')
  const restored=new DatabaseSync(path.join(restore,'cms.db'),{readOnly:true})
  let pages=0
  try{if(restored.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')throw new Error('Échec du contrôle d’intégrité SQLite.');pages=Number(restored.prepare('SELECT count(*) AS n FROM pages').get()?.n||0)}finally{restored.close()}
  for(const file of manifest){const source=path.join(root,'files',file.path);const dest=path.join(restore,'files',file.path);await mkdir(path.dirname(dest),{recursive:true});await copyFile(source,dest);const bytes=await readFile(dest);if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Échec de vérification d’un fichier restauré.')}
  for(const file of configuration){const dest=path.join(restore,'configuration',file.archivePath);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,'configuration',file.archivePath),dest);if(createHash('sha256').update(await readFile(dest)).digest('hex')!==file.sha256)throw new Error('Échec de vérification de la configuration restaurée.')}
  const completedAt=new Date().toISOString()
  const report={status:'completed' as const,completedAt,files:manifest.length,pages,scope:'SQLite, historiques, médias publics, fichiers privés, pièces jointes de briefs, imports médias en cours sans verrous, archives de conservation, observations Search Console, fichiers statiques ; restauration isolée et empreintes vérifiées',backupID:stamp}
  await writeFile(path.join(root,'manifest.json'),JSON.stringify({report,database,configuration,files:manifest},null,2),{mode:0o600})
  await mkdir('.data/health',{recursive:true});await writeFile('.data/health/backup.json',JSON.stringify(report,null,2),{mode:0o600})
  return report
}
