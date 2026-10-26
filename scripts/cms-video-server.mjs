import { readFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { spawn } from 'node:child_process'

// Load in-process: Next's child workers must not inherit a --env-file CLI flag.
const fixture = JSON.parse(await readFile('.data/video-qa-latest.json', 'utf8'))
loadEnvFile(fixture.environmentFile)
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3300'], { stdio: 'inherit', env: process.env, windowsHide: true })
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => child.kill(signal))
child.once('error', error => { console.error(error.message); process.exitCode = 1 })
child.once('close', code => { process.exitCode = code ?? 1 })
