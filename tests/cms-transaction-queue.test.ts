import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload } from 'payload'
import { installTransactionQueue } from '../src/cms/transaction-queue'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve))

test('le verrou attend la fin effective même si commit et rollback arrivent ensemble', async () => {
  const ending = deferred()
  const events: string[] = []
  let nextID = 0
  const payload = { db: {
    beginTransaction: async () => { events.push('begin'); return ++nextID },
    commitTransaction: async () => { events.push('commit-start'); await ending.promise; events.push('commit-end') },
    rollbackTransaction: async () => { events.push('rollback') },
  } } as unknown as Payload
  installTransactionQueue(payload)
  const wrapped = payload.db.beginTransaction
  installTransactionQueue(payload)
  assert.equal(payload.db.beginTransaction, wrapped, 'Une réinitialisation ne doit pas empiler les verrous')
  const first = await payload.db.beginTransaction()
  const second = payload.db.beginTransaction()
  const commit = payload.db.commitTransaction(Promise.resolve(first!))
  const duplicate = payload.db.rollbackTransaction(first!)
  await flush()
  assert.deepEqual(events, ['begin', 'commit-start'])
  ending.resolve()
  await Promise.all([commit, duplicate])
  const secondID = await second
  assert.deepEqual(events, ['begin', 'commit-start', 'commit-end', 'begin'])
  await payload.db.rollbackTransaction(secondID!)
  assert.equal(events.at(-1), 'rollback')
})

test('échec de début, absence de transaction et échec de fin libèrent toujours le prochain appel', async () => {
  let attempt = 0
  const payload = { db: {
    beginTransaction: async () => { attempt++; if (attempt === 1) throw new Error('begin failed'); return attempt === 2 ? null : attempt },
    commitTransaction: async () => {},
    rollbackTransaction: async () => { throw new Error('rollback failed') },
  } } as unknown as Payload
  installTransactionQueue(payload)
  const first = payload.db.beginTransaction()
  const second = payload.db.beginTransaction()
  const third = payload.db.beginTransaction()
  await assert.rejects(first, /begin failed/)
  assert.equal(await second, null)
  assert.equal(await third, 3)
  const fourth = payload.db.beginTransaction()
  await assert.rejects(payload.db.rollbackTransaction(3), /rollback failed/)
  assert.equal(await fourth, 4)
  await payload.db.commitTransaction(4)
  assert.equal(await payload.db.beginTransaction(), 5)
  await payload.db.commitTransaction(5)
})
