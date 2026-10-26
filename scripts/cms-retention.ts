import {getCMS} from '../src/cms/payload'
import {applyRetention} from '../src/cms/retention'
if(process.argv.slice(2).some(arg=>arg!=='--apply'))throw new Error('Utilisation : npm run cms:retention [-- --apply]. Sans --apply, aperçu sans modification.')
const cms=await getCMS()
try{console.log(JSON.stringify(await applyRetention(cms,{apply:process.argv.includes('--apply')}),null,2))}finally{await cms.destroy()}
