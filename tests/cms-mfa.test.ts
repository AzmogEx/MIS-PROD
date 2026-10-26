import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { buildConfig, createLocalReq, getPayload, type Payload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { installTransactionQueue } from '../src/cms/transaction-queue'
import { createRecoveryCodes, decryptMFASecret, encodeBase32, encryptMFASecret, getSecurityState, manageMFA, matchedCounter, mfaAfterError, mfaAfterOperation, mfaBeforeLogin, mfaBeforeOperation, mfaFields, mfaUserGuard, reserveMFAAttempt, totp } from '../src/cms/mfa'

let payload: Payload
let directory: string
let userID: string | number
const password = randomBytes(24).toString('hex')
const email = 'mfa-recette@example.test'
let secret: string
let recoveryCodes: string[]

before(async () => {
  await mkdir('.cms', { recursive: true })
  directory = await mkdtemp(path.resolve('.cms/test-mfa-'))
  process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
  payload = await getPayload({ config: buildConfig({
    onInit: installTransactionQueue,
    secret: process.env.PAYLOAD_SECRET, telemetry: false, typescript: { autoGenerate: false }, graphQL: { disable: true },
    db: sqliteAdapter({ client: { url: `file:${path.join(directory, 'mfa.db').replaceAll('\\', '/')}` }, push: true, transactionOptions: { behavior: 'immediate' }, wal: true, busyTimeout: 10000 }),
    collections: [
      { slug: 'users', auth: { useSessions: true }, fields: [{ name: 'role', type: 'text' }, ...mfaFields], hooks: { beforeChange: [mfaUserGuard], beforeOperation: [mfaBeforeOperation], beforeLogin: [mfaBeforeLogin], afterOperation: [mfaAfterOperation], afterError: [mfaAfterError] } },
      { slug: 'submission-limits', fields: [{ name: 'key', type: 'text', required: true, unique: true }, { name: 'expiresAt', type: 'date', required: true }] },
    ],
  }) })
  const user = await payload.create({ collection: 'users', data: { email, password, role: 'owner' } })
  userID = user.id
})

after(async () => {
  if (payload) { (payload.db as unknown as { client?: { close: () => void } }).client?.close(); await payload.destroy() }
  if (directory && directory.startsWith(path.resolve('.cms') + path.sep)) await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {})
})

async function login(code = '', selectedPassword = password) {
  const req = await createLocalReq({ req: { data: { code } } }, payload)
  try { return await payload.login({ collection: 'users', data: { email, password: selectedPassword }, req, overrideAccess: false }) }
  catch (error) {
    // REST executes afterError centrally; reproduce that lifecycle for the Local API test.
    await mfaAfterError({ collection: payload.collections.users.config, req, context: req.context, error: error as Error })
    throw error
  }
}

test('TOTP reproduit les vecteurs SHA-1 RFC 6238 ; le chiffrement authentifie les secrets', () => {
  const known = encodeBase32(Buffer.from('12345678901234567890'))
  assert.equal(totp(known, 59000, 8), '94287082')
  assert.equal(totp(known, 1111111109000, 8), '07081804')
  assert.equal(totp(known, 1234567890000, 8), '89005924')
  assert.equal(matchedCounter(known, totp(known, 1234567890000), 1234567890000), Math.floor(1234567890 / 30))
  assert.equal(matchedCounter(known, 'invalid'), null)
  const encrypted = encryptMFASecret(known)
  assert.notEqual(encrypted, known)
  assert.equal(decryptMFASecret(encrypted), known)
  const pieces = encrypted.split('.')
  pieces[3] = (pieces[3][0] === 'A' ? 'B' : 'A') + pieces[3].slice(1)
  assert.throws(() => decryptMFASecret(pieces.join('.')))
  const recovery = createRecoveryCodes()
  assert.equal(new Set(recovery.codes).size, 10)
  assert.equal(new Set(recovery.hashes).size, 10)
})

test('L’enrôlement exige le mot de passe, cache le secret et vérifie un code avant activation', async () => {
  const previousSession = await login()
  assert.ok(previousSession.token)
  await assert.rejects(manageMFA(payload, userID, { action: 'enroll', password: 'incorrect' }))
  const enrollment = await manageMFA(payload, userID, { action: 'enroll', password })
  assert.ok('secret' in enrollment)
  secret = enrollment.secret!
  assert.match(enrollment.uri!, /^otpauth:\/\/totp\//)
  const publicUser = await payload.findByID({ collection: 'users', id: userID, user: { ...previousSession.user, collection: 'users' }, overrideAccess: false })
  assert.equal(publicUser.mfaSecret, undefined)
  assert.equal(publicUser.mfaPendingSecret, undefined)
  assert.equal(publicUser.mfaRecoveryHashes, undefined)
  await assert.rejects(manageMFA(payload, userID, { action: 'confirm', password, code: 'invalid' }))
  assert.equal((await getSecurityState(payload, userID)).enabled, false)
  const confirmed = await manageMFA(payload, userID, { action: 'confirm', password, code: totp(secret) })
  assert.ok('recoveryCodes' in confirmed)
  recoveryCodes = confirmed.recoveryCodes!
  assert.equal(recoveryCodes.length, 10)
  assert.equal((await getSecurityState(payload, userID)).enabled, true)
  const stale = await payload.auth({ headers: new Headers({ Authorization: `Bearer ${previousSession.token}` }) })
  assert.equal(stale.user, null)
})

test('Aucune session sans second facteur ; code correct accepté une fois puis rejeu refusé', async () => {
  await assert.rejects(login('invalid'))
  await assert.rejects(login())
  const code = totp(secret, Date.now() + 30000)
  const result = await login(code)
  assert.ok(result.token)
  assert.ok(result.user)
  assert.equal(result.user.mfaSecret, undefined)
  assert.equal(result.user.mfaRecoveryHashes, undefined)
  await assert.rejects(login(code))
})

test('Les codes de récupération sont à usage unique, y compris deux connexions concurrentes', async () => {
  const result = await login(recoveryCodes[0])
  assert.ok(result.token)
  assert.equal((await getSecurityState(payload, userID)).recoveryRemaining, 9)
  await assert.rejects(login(recoveryCodes[0]))
  const concurrent = await Promise.allSettled([login(recoveryCodes[1]), login(recoveryCodes[1])])
  assert.equal(concurrent.filter((item) => item.status === 'fulfilled').length, 1)
})

test('Les champs MFA ne peuvent être changés par une mise à jour ordinaire ou Local API', async () => {
  await assert.rejects(payload.update({ collection: 'users', id: userID, data: { mfaEnabled: false }, overrideAccess: true }))
  const req = await createLocalReq({ req: { data: { code: recoveryCodes[2] } } }, payload)
  await payload.db.updateOne({ collection: 'users', id: userID, data: { resetPasswordToken: 'test-reset-token', resetPasswordExpiration: new Date(Date.now() + 60000).toISOString() } })
  await assert.rejects(async () => mfaBeforeOperation({ operation: 'resetPassword', args: { collection: payload.collections.users, data: { token: 'test-reset-token', password }, req }, collection: payload.collections.users.config, context: req.context, req }))
})

test('La révocation des sessions et la désactivation exigent password + code et invalident les JWT', async () => {
  const sessions = await getSecurityState(payload, userID)
  assert.ok(sessions.sessions.length > 0)
  await assert.rejects(manageMFA(payload, userID, { action: 'disable', password, code: 'invalid' }))
  await manageMFA(payload, userID, { action: 'revoke-others', password, code: recoveryCodes[2] })
  assert.equal((await getSecurityState(payload, userID)).sessions.length, 0)
  await manageMFA(payload, userID, { action: 'disable', password, code: recoveryCodes[3] })
  assert.equal((await getSecurityState(payload, userID)).enabled, false)
  assert.equal((await getSecurityState(payload, userID)).recoveryRemaining, 0)
})

test('La limite de tentatives est persistante et bornée', async () => {
  for (let attempt = 0; attempt < 10; attempt++) await reserveMFAAttempt(payload, 'isolated-rate-test')
  await assert.rejects(reserveMFAAttempt(payload, 'isolated-rate-test'), /Trop de tentatives/)
  const stored = await payload.find({ collection: 'submission-limits', pagination: false, overrideAccess: true })
  assert.ok(stored.docs.length >= 10)
})
