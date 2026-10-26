import {spawn} from 'node:child_process'
let stopped=false,child
const timeout=Number(process.env.CMS_WORKER_RUN_TIMEOUT_MS||600000)
if(!Number.isSafeInteger(timeout)||timeout<300000||timeout>3600000)throw new Error('CMS_WORKER_RUN_TIMEOUT_MS doit être compris entre 300000 et 3600000.')
const stop=()=>{stopped=true;child?.kill('SIGTERM')}
process.once('SIGTERM',stop)
process.once('SIGINT',stop)
while(!stopped){
  const result=await new Promise(resolve=>{
    child=spawn(process.execPath,['--import','tsx','scripts/cms-worker.ts'],{stdio:'inherit',windowsHide:true,env:process.env})
    let force
    const deadline=setTimeout(()=>{console.error('Worker MIS : durée maximale dépassée ; arrêt du passage. Les résultats incertains seront signalés à la reprise.');child.kill('SIGTERM');force=setTimeout(()=>child.kill('SIGKILL'),10000);force.unref()},timeout)
    deadline.unref()
    const done=code=>{clearTimeout(deadline);clearTimeout(force);resolve(code)}
    child.once('error',()=>done(1));child.once('close',code=>done(code??1))
  })
  if(stopped)break
  if(result!==0)console.error('Worker MIS en échec. Nouvelle tentative bornée dans 60 secondes ; consulter les traitements persistés.')
  for(let tick=0;tick<60&&!stopped;tick++)await new Promise(resolve=>setTimeout(resolve,1000))
}
