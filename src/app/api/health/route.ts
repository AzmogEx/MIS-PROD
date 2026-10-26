import {getCMS} from '@/cms/payload'
export const dynamic='force-dynamic'
export async function GET(){
  try{await(await getCMS()).count({collection:'pages',overrideAccess:true});return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})}
  catch{return Response.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}})}
}
