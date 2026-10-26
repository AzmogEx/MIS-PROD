import { type MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/** Populate only newly added null columns, including restorable versions. */
export async function up({db}:MigrateUpArgs):Promise<void>{
  for(const table of ['site_content_ui','_site_content_v_version_ui']){
    for(const [column,value] of Object.entries({legal_eyebrow:'Légal',last_update_label:'Dernière mise à jour',form_unavailable:'Le formulaire est momentanément indisponible. Contactez {{email}}.',download_label:'Télécharger',privacy_label:'Confidentialité',production_label:'Production'})){
      await db.run(sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${value} WHERE ${sql.identifier(column)} IS NULL`)
    }
  }
}
// Retain imported copy on rollback; the preceding schema migration owns columns.
export async function down():Promise<void>{}
