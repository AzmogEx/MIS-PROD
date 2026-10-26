import { inspectWorkerObservation, readWorkerObservation } from '../src/cms/worker-health'
const observation = await readWorkerObservation()
const result = inspectWorkerObservation(observation)
console.log(JSON.stringify({ ...result, observedAt: observation?.observedAt || null }))
process.exitCode = result.healthy ? 0 : 1
