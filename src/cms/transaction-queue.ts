import type { Payload } from 'payload'

const installed = new WeakSet<Payload['db']>()

/** Serialize transactions sharing one SQLite client. Nested operations must keep
 * their existing req.transactionID so Payload reuses the open transaction. */
export function installTransactionQueue(payload: Payload): void {
  const adapter = payload.db
  if (installed.has(adapter)) return
  installed.add(adapter)
  const begin = adapter.beginTransaction.bind(adapter)
  const commit = adapter.commitTransaction.bind(adapter)
  const rollback = adapter.rollbackTransaction.bind(adapter)
  let tail = Promise.resolve()
  const leases = new Map<string, { release: () => void; ending?: Promise<void> }>()

  adapter.beginTransaction = async options => {
    const previous = tail
    let release!: () => void
    tail = new Promise<void>(resolve => { release = resolve })
    await previous
    try {
      const id = await begin(options)
      if (id === null || id === undefined) release()
      else leases.set(String(id), { release })
      return id
    } catch (error) {
      release()
      throw error
    }
  }

  const finish = async (incomingID: Parameters<typeof commit>[0], operation: typeof commit) => {
    const id = await incomingID
    const key = String(id)
    const lease = leases.get(key)
    if (!lease) return operation(id)
    // Payload removes its session before the database finishes. A concurrent
    // second commit/rollback must wait for the first, never release early.
    if (!lease.ending) {
      lease.ending = Promise.resolve().then(() => operation(id)).finally(() => {
        leases.delete(key)
        lease.release()
      })
    }
    return lease.ending
  }
  adapter.commitTransaction = id => finish(id, commit)
  adapter.rollbackTransaction = id => finish(id, rollback)
}
