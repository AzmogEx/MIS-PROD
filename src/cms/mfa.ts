import { createCipheriv, createDecipheriv, createHash, createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { APIError } from 'payload'
import type { CollectionAfterOperationHook, CollectionBeforeChangeHook, CollectionBeforeLoginHook, CollectionBeforeOperationHook, CollectionConfig, Field, Payload, PayloadRequest } from 'payload'

type MFARecord = { id: string | number; email?: string; hash?: string; salt?: string; mfaEnabled?: boolean; mfaSecret?: string; mfaPendingSecret?: string | null; mfaPendingExpiresAt?: string | null; mfaRecoveryHashes?: string[]; mfaLastCounter?: number | null; sessions?: Array<{ id: string; createdAt: string; expiresAt: string }> }
const derivePassword = promisify(pbkdf2)
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const deniedField = { read: () => false, create: () => false, update: () => false }
class MFAError extends APIError { constructor(message: string) { super(message, 401) } }

export const mfaFields: Field[] = [
  { name: 'mfaEnabled', label: 'Double authentification activée', type: 'checkbox', defaultValue: false, admin: { readOnly: true, description: 'Gérer dans /securite. L’activation nécessite une vérification dans votre application d’authentification.' }, access: { create: () => false, update: () => false } },
  { name: 'mfaSecret', type: 'text', admin: { hidden: true }, access: deniedField },
  { name: 'mfaPendingSecret', type: 'text', admin: { hidden: true }, access: deniedField },
  { name: 'mfaPendingExpiresAt', type: 'date', admin: { hidden: true }, access: deniedField },
  { name: 'mfaRecoveryHashes', type: 'json', admin: { hidden: true }, access: deniedField },
  { name: 'mfaLastCounter', type: 'number', admin: { hidden: true }, access: deniedField },
]

export const mfaUserGuard: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  for (const key of Object.keys(data)) {
    if (!key.startsWith('mfa')) continue
    const previous = originalDoc?.[key] ?? (key === 'mfaEnabled' ? false : null)
    if (JSON.stringify(data[key] ?? null) !== JSON.stringify(previous)) throw new MFAError('Les réglages de double authentification se modifient uniquement depuis /securite.')
  }
  return data
}

export function encodeBase32(bytes: Buffer): string {
  let value = 0; let bits = 0; let result = ''
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { result += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5 } }
  if (bits) result += alphabet[(value << (5 - bits)) & 31]
  return result
}

function decodeBase32(secret: string): Buffer {
  let value = 0; let bits = 0; const bytes: number[] = []
  for (const character of secret.toUpperCase().replace(/=+$/, '')) {
    const index = alphabet.indexOf(character)
    if (index < 0) throw new MFAError('Secret TOTP invalide.')
    value = (value << 5) | index; bits += 5
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(bytes)
}

export function totp(secret: string, timestamp = Date.now(), digits = 6): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30000)))
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  const binary = digest.readUInt32BE(offset) & 0x7fffffff
  return String(binary % (10 ** digits)).padStart(digits, '0')
}

export function matchedCounter(secret: string, code: string, timestamp = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const counter = Math.floor(timestamp / 30000)
  for (const offset of [0, -1, 1]) {
    if (counter + offset < 0) continue
    const expected = totp(secret, (counter + offset) * 30000)
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return counter + offset
  }
  return null
}

function cipherKey() {
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32) throw new MFAError('Configuration de chiffrement MFA manquante.')
  return createHash('sha256').update(`mis-mfa-v1:${process.env.PAYLOAD_SECRET}`).digest()
}

export function encryptMFASecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptMFASecret(encrypted: string): string {
  const [version, iv, tag, ciphertext] = encrypted.split('.')
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new MFAError('Secret MFA illisible.')
  const decipher = createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}

function recoveryHash(code: string): string { return createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase()).digest('hex') }
export function createRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => randomBytes(10).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'))
  return { codes, hashes: codes.map(recoveryHash) }
}

async function readMFAUser(payload: Payload, id: string | number, req?: Partial<PayloadRequest>): Promise<MFARecord> {
  const user = await payload.db.findOne({ collection: 'users', where: { id: { equals: id } }, req })
  if (!user) throw new MFAError('Compte introuvable.')
  return user as unknown as MFARecord
}

async function writeMFAUser(payload: Payload, id: string | number, patch: Record<string, unknown>, req?: Partial<PayloadRequest>) {
  // Updating Payload's sessions array uses its relational upsert path: retain required columns.
  const current = await readMFAUser(payload, id, req)
  await payload.db.updateOne({ collection: 'users', id, data: { ...current, ...patch }, req })
}

export async function reserveMFAAttempt(payload: Payload, identity: string): Promise<void> {
  const window = Math.floor(Date.now() / 900000)
  const digest = createHmac('sha256', cipherKey()).update(identity.toLowerCase()).digest('hex')
  for (let slot = 0; slot < 10; slot++) {
    try { await payload.db.create({ collection: 'submission-limits', data: { key: `mfa-attempt:${digest}:${window}:${slot}`, expiresAt: new Date((window + 1) * 900000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }); return } catch { /* A single atomic insert reserves a unique slot, without a competing write transaction. */ }
  }
  throw new MFAError('Trop de tentatives de sécurité. Réessayez dans 15 minutes.')
}

async function acquireSecurityLock(payload: Payload, userID: string | number): Promise<string | number> {
  const key = `mfa-account-lock:${userID}`
  const expired = await payload.find({ collection: 'submission-limits', where: { and: [{ key: { equals: key } }, { expiresAt: { less_than: new Date().toISOString() } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (expired.docs[0]) await payload.delete({ collection: 'submission-limits', id: expired.docs[0].id, overrideAccess: true })
  try {
    const lock = await payload.db.create({ collection: 'submission-limits', data: { key, expiresAt: new Date(Date.now() + 120000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } })
    return lock.id
  } catch { throw new MFAError('Une opération de sécurité est déjà en cours. Réessayez dans quelques instants (au plus deux minutes après une interruption).') }
}

async function releaseSecurityLock(payload: Payload, lockID: string | number, req?: Partial<PayloadRequest>) {
  await payload.delete({ collection: 'submission-limits', id: lockID, overrideAccess: true, req }).catch(() => { /* The lease also expires after an interrupted request. */ })
}

export const mfaBeforeOperation: CollectionBeforeOperationHook = async ({ operation, args, req }) => {
  if (operation === 'login') {
    const data = ('data' in args ? args.data : req.data) as { email?: string } | undefined
    if (typeof data?.email === 'string') {
      const account = await req.payload.db.findOne({ collection: 'users', where: { email: { equals: data.email.toLowerCase().trim() } } }) as MFARecord | null
      if (account?.mfaEnabled) await reserveMFAAttempt(req.payload, `login:${data.email}`)
      if (account) req.context.mfaLockID = await acquireSecurityLock(req.payload, account.id)
    }
  }
  // Payload's password reset also issues a session. MFA accounts use managed password recovery,
  // because failed reset transactions would roll back their own attempt counters.
  if (operation === 'resetPassword') {
    const data = ('data' in args ? args.data : req.data) as { token?: string } | undefined
    if (data?.token) {
      const account = await req.payload.db.findOne({ collection: 'users', where: { resetPasswordToken: { equals: data.token } }, req }) as MFARecord | null
      if (account?.mfaEnabled) throw new MFAError('Compte protégé par double authentification : demandez une récupération de mot de passe contrôlée au propriétaire MIS. La MFA reste active.')
    }
  }
  return args
}

export const mfaAfterOperation: CollectionAfterOperationHook = async ({ operation, req, result }) => {
  if (operation === 'login' && req.context.mfaLockID) {
    await releaseSecurityLock(req.payload, req.context.mfaLockID as string | number, req)
    delete req.context.mfaLockID
  }
  return result
}

export const mfaAfterError: NonNullable<NonNullable<CollectionConfig['hooks']>['afterError']>[number] = async ({ req }) => {
  if (req.context.mfaLockID) {
    await releaseSecurityLock(req.payload, req.context.mfaLockID as string | number)
    delete req.context.mfaLockID
  }
}

async function consumeCode(payload: Payload, user: MFARecord, rawCode: unknown, req?: Partial<PayloadRequest>) {
  const code = typeof rawCode === 'string' ? rawCode.trim().replace(/\s/g, '') : ''
  if (!user.mfaSecret) throw new MFAError('Configuration MFA incomplète. Contactez le propriétaire.')
  const secret = decryptMFASecret(user.mfaSecret)
  const counter = matchedCounter(secret, code)
  const digest = recoveryHash(code)
  const recovery = user.mfaRecoveryHashes?.includes(digest)
  if (counter === null && !recovery) throw new MFAError('Code MFA invalide. Utilisez /connexion avec un code de votre application ou un code de récupération.')
  const key = counter !== null ? `mfa-otp:${user.id}:${createHash('sha256').update(secret).digest('hex').slice(0, 24)}:${counter}` : `mfa-recovery:${user.id}:${digest}`
  try {
    await payload.create({ collection: 'submission-limits', data: { key, expiresAt: counter !== null ? new Date(Date.now() + 300000).toISOString() : '2100-01-01T00:00:00.000Z' }, req, overrideAccess: true })
  } catch { throw new MFAError('Ce code MFA a déjà été utilisé. Attendez le code suivant ou utilisez un autre code de récupération.') }
  const patch = counter !== null ? { mfaLastCounter: counter } : { mfaRecoveryHashes: user.mfaRecoveryHashes!.filter((hash) => hash !== digest) }
  await writeMFAUser(payload, user.id, patch, req)
  return patch
}

export const mfaBeforeLogin: CollectionBeforeLoginHook = async ({ user, req }) => {
  const current = await readMFAUser(req.payload, user.id, req)
  if (!current.mfaEnabled) return user
  const patch = await consumeCode(req.payload, current, req.data?.code, req)
  return { ...user, ...patch }
}

async function checkPassword(user: MFARecord, password: unknown) {
  if (typeof password !== 'string' || password.length > 1024 || typeof user.hash !== 'string' || typeof user.salt !== 'string') throw new MFAError('Mot de passe incorrect.')
  // Password formats from pinned Payload 3.92.0, supporting its current and legacy hashes.
  const current = user.hash.startsWith('pbkdf2-sha256-v1:')
  const stored = current ? user.hash.slice('pbkdf2-sha256-v1:'.length) : user.hash
  if (!/^[a-f0-9]+$/i.test(stored) || stored.length !== (current ? 64 : 1024)) throw new MFAError('Format de mot de passe non pris en charge. Contactez le propriétaire.')
  const actual = await derivePassword(password, user.salt, current ? 600000 : 25000, current ? 32 : 512, 'sha256')
  const expected = Buffer.from(stored, 'hex')
  if (!timingSafeEqual(actual, expected)) throw new MFAError('Mot de passe incorrect.')
}

async function auditSecurity(payload: Payload, userID: string | number, action: string) {
  if (payload.collections['audit-log']) await payload.create({ collection: 'audit-log', data: { action, collectionName: 'users', documentID: String(userID), actor: userID, occurredAt: new Date().toISOString() }, overrideAccess: true })
}

export async function getSecurityState(payload: Payload, userID: string | number, currentSession?: string) {
  const user = await readMFAUser(payload, userID)
  return { enabled: Boolean(user.mfaEnabled), pending: Boolean(user.mfaPendingSecret && user.mfaPendingExpiresAt && Date.parse(user.mfaPendingExpiresAt) > Date.now()), recoveryRemaining: user.mfaRecoveryHashes?.length || 0, sessions: (user.sessions || []).filter((session) => Date.parse(session.expiresAt) > Date.now()).map((session) => ({ id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, current: session.id === currentSession })) }
}

async function manageMFAUnlocked(payload: Payload, userID: string | number, input: { action: string; password?: string; code?: string; sessionID?: string }, currentSession?: string) {
  const user = await readMFAUser(payload, userID)
  await checkPassword(user, input.password)
  if (input.action === 'enroll') {
    if (user.mfaEnabled) throw new MFAError('La double authentification est déjà active.')
    const secret = encodeBase32(randomBytes(20))
    await writeMFAUser(payload, userID, { mfaPendingSecret: encryptMFASecret(secret), mfaPendingExpiresAt: new Date(Date.now() + 900000).toISOString() })
    await auditSecurity(payload, userID, 'mfa-enrollment-started')
    return { secret, uri: `otpauth://totp/${encodeURIComponent(`MIS:${user.email}`)}?secret=${secret}&issuer=MIS&algorithm=SHA1&digits=6&period=30`, expiresInMinutes: 15 }
  }
  if (input.action === 'confirm') {
    if (user.mfaEnabled || !user.mfaPendingSecret || !user.mfaPendingExpiresAt || Date.parse(user.mfaPendingExpiresAt) <= Date.now()) throw new MFAError('L’activation a expiré. Recommencez l’enrôlement.')
    const secret = decryptMFASecret(user.mfaPendingSecret)
    if (matchedCounter(secret, input.code || '') === null) throw new MFAError('Le code ne correspond pas à la clé d’activation.')
    const recovery = createRecoveryCodes()
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new MFAError('Les transactions sont nécessaires à la sécurité MFA.')
    const req = { transactionID } as Partial<PayloadRequest>
    try {
      const current = await readMFAUser(payload, userID, req)
      if (current.mfaEnabled || current.mfaPendingSecret !== user.mfaPendingSecret) throw new MFAError('L’activation a changé. Recommencez.')
      await writeMFAUser(payload, userID, { mfaEnabled: true, mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null, mfaPendingExpiresAt: null, mfaRecoveryHashes: recovery.hashes, sessions: [] }, req)
      await consumeCode(payload, { ...user, mfaSecret: user.mfaPendingSecret, mfaEnabled: true }, input.code, req)
      await payload.db.commitTransaction(transactionID)
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    await auditSecurity(payload, userID, 'mfa-enabled-all-sessions-revoked')
    return { enabled: true, recoveryCodes: recovery.codes, reconnect: true }
  }
  if (input.action === 'disable') {
    if (!user.mfaEnabled) throw new MFAError('La double authentification est déjà désactivée.')
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new MFAError('Les transactions sont nécessaires à la sécurité MFA.')
    const req = { transactionID } as Partial<PayloadRequest>
    try {
      const current = await readMFAUser(payload, userID, req)
      await consumeCode(payload, current, input.code, req)
      await writeMFAUser(payload, userID, { mfaEnabled: false, mfaSecret: null, mfaPendingSecret: null, mfaPendingExpiresAt: null, mfaRecoveryHashes: [], mfaLastCounter: null, sessions: [] }, req)
      await payload.db.commitTransaction(transactionID)
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    await auditSecurity(payload, userID, 'mfa-disabled-all-sessions-revoked')
    return { enabled: false, reconnect: true }
  }
  if (input.action === 'revoke-session' || input.action === 'revoke-others') {
    if (user.mfaEnabled) await consumeCode(payload, user, input.code)
    const sessions = (user.sessions || []).filter((session) => input.action === 'revoke-others' ? session.id === currentSession : session.id !== input.sessionID)
    await writeMFAUser(payload, userID, { sessions })
    await auditSecurity(payload, userID, input.action)
    return { ok: true, reconnect: input.action === 'revoke-session' && input.sessionID === currentSession }
  }
  throw new MFAError('Action de sécurité inconnue.')
}

export async function manageMFA(payload: Payload, userID: string | number, input: { action: string; password?: string; code?: string; sessionID?: string }, currentSession?: string) {
  await reserveMFAAttempt(payload, `security:${userID}`)
  const lockID = await acquireSecurityLock(payload, userID)
  try { return await manageMFAUnlocked(payload, userID, input, currentSession) }
  finally { await releaseSecurityLock(payload, lockID) }
}
