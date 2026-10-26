import { fixturePayload, fixtureTransport } from './worker-config'
import { runWorkerCycle } from '../../src/cms/worker-runner'
const payload = await fixturePayload()
try { console.log(JSON.stringify(await runWorkerCycle(payload, { transport: fixtureTransport }))) }
finally { await payload.destroy() }
