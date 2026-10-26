import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readdir,readFile} from 'node:fs/promises'
import path from 'node:path'
import type {Payload} from 'payload'
import {misAuthEmail} from '../src/cms/auth-email'
test('auth email : capture par défaut, activation distincte, idempotence et erreurs sans fuite',async()=>{
  const mailbox=path.resolve('.data/tests/auth-mail-'+randomUUID())
  let calls=0,lastBody='',lastKey=''
  const fakeFetch:typeof fetch=async(_url,options)=>{calls++;lastBody=String(options?.body);lastKey=new Headers(options?.headers).get('Idempotency-Key')||'';return Response.json({id:'test-provider'})}
  const message={to:'owner@example.test',subject:'Récupération',html:'<p>Lien de test local</p>'}
  delete process.env.CMS_AUTH_EMAIL_DELIVERY
  const adapter=misAuthEmail({mailbox,fetch:fakeFetch})({payload:{}as Payload})
  await adapter.sendEmail(message)
  assert.equal(calls,0)
  const files=await readdir(mailbox);assert.equal(files.length,1)
  assert.equal(JSON.parse(await readFile(path.join(mailbox,files[0]),'utf8')).to,message.to)
  process.env.CMS_AUTH_EMAIL_DELIVERY='enabled';delete process.env.RESEND_API_KEY
  await assert.rejects(()=>adapter.sendEmail(message),/non configurée/)
  process.env.RESEND_API_KEY='isolated-test-key';process.env.CONTACT_SENDER='MIS <test@example.test>'
  await adapter.sendEmail(message);const key=lastKey;await adapter.sendEmail(message)
  assert.equal(lastKey,key);assert.equal(JSON.parse(lastBody).from,process.env.CONTACT_SENDER);assert.equal(calls,2)
  const failed=misAuthEmail({fetch:async()=>new Response('provider private details',{status:503})})({payload:{}as Payload})
  await assert.rejects(()=>failed.sendEmail(message),error=>error instanceof Error&&error.message.includes('HTTP 503')&&!error.message.includes('private details'))
  delete process.env.CMS_AUTH_EMAIL_DELIVERY;delete process.env.RESEND_API_KEY;delete process.env.CONTACT_SENDER
})
