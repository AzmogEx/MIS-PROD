import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import type {EmailAdapter} from 'payload'

/** Authentication mail is independently gated from prospect notifications. */
export function misAuthEmail(options:{fetch?:typeof fetch;mailbox?:string}={}):EmailAdapter{
  return ()=>({
    name:process.env.CMS_AUTH_EMAIL_DELIVERY==='enabled'?'mis-resend-auth':'mis-local-mailbox',
    defaultFromAddress:process.env.CONTACT_SENDER||'noreply@mis-prod.fr',defaultFromName:'MIS Production',
    sendEmail:async message=>{
      if(process.env.CMS_AUTH_EMAIL_DELIVERY!=='enabled'){
        const directory=path.resolve(options.mailbox||'.data/mailbox');await mkdir(directory,{recursive:true})
        await writeFile(path.join(directory,randomUUID()+'.json'),JSON.stringify({capturedAt:new Date().toISOString(),...message}),{mode:0o600})
        return {captured:true}
      }
      if(!process.env.RESEND_API_KEY||!process.env.CONTACT_SENDER)throw new Error('Messagerie d’authentification non configurée : clé Resend et expéditeur vérifié requis.')
      const recipients=(Array.isArray(message.to)?message.to:[message.to]).map(value=>typeof value==='string'?value:value?.address)
      if(recipients.length!==1||!recipients[0]||!/^\S+@\S+\.\S+$/.test(recipients[0]))throw new Error('Destinataire d’authentification invalide.')
      const body={from:process.env.CONTACT_SENDER,to:recipients as string[],subject:message.subject||'Votre compte MIS',...(typeof message.html==='string'?{html:message.html}:{}),...(typeof message.text==='string'?{text:message.text}:{})}
      if(!('html'in body)&&!('text'in body))throw new Error('Message d’authentification vide.')
      const encoded=JSON.stringify(body)
      const response=await(options.fetch||fetch)('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'auth:'+createHash('sha256').update(encoded).digest('hex')},body:encoded})
      if(!response.ok)throw new Error(`Messagerie d’authentification indisponible (HTTP ${response.status}).`)
      const result:unknown=await response.json()
      if(!result||typeof result!=='object'||!('id'in result)||typeof result.id!=='string')throw new Error('Réponse de messagerie invalide.')
      return {providerId:result.id}
    },
  })
}
