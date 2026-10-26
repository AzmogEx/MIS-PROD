import { getCMS } from '../src/cms/payload'
if(!process.env.CMS_OWNER_EMAIL||!process.env.CMS_OWNER_PASSWORD||process.env.CMS_OWNER_PASSWORD.length<14)throw new Error('Fournissez CMS_OWNER_EMAIL et CMS_OWNER_PASSWORD (14 caractères minimum) dans l’environnement protégé du serveur.')
const cms=await getCMS()
try{
  const exists=await cms.count({collection:'users'})
  if(exists.totalDocs)throw new Error('Des comptes existent. Utilisez la gestion des comptes depuis une session propriétaire.')
  await cms.create({collection:'users',data:{email:process.env.CMS_OWNER_EMAIL,password:process.env.CMS_OWNER_PASSWORD,name:process.env.CMS_OWNER_NAME||'Propriétaire MIS',role:'owner'},context:{bootstrap:true}})
  console.log('Compte propriétaire créé. Aucun identifiant n’a été affiché.')
}finally{await cms.destroy()}
