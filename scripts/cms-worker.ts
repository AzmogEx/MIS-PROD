import { getCMS } from '../src/cms/payload'
import { runWorkerCycle } from '../src/cms/worker-runner'
const payload = await getCMS()
try {
  console.log(JSON.stringify(await runWorkerCycle(payload)))
} finally { await payload.destroy() }
