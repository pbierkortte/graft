import { spawn } from 'node:child_process'
import {
  existsSync, mkdirSync, readdirSync, readFileSync,
  writeFileSync, rmSync, chmodSync, statSync,
} from 'node:fs'
import { join } from 'node:path'
import { config } from './config.js'

const parseTimeout = (scriptPath: string): number => {
  try {
    const lines = readFileSync(scriptPath, 'utf-8').split('\n').slice(0, 3)
    for (const line of lines) {
      const match = line.match(/^\s*#\s*timeout:\s*(\d+)/)
      if (match) return parseInt(match[1], 10)
    }
  } catch { /* ignore */ }
  return config.execTimeout
}

const runScript = (scriptPath: string, outDir: string, name: string): Promise<void> =>
  new Promise((resolve) => {
    const timeout = parseTimeout(scriptPath)
    chmodSync(scriptPath, 0o755)

    const proc = spawn('bash', [scriptPath], {
      cwd: config.workspace,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      try { process.kill(-proc.pid!, 'SIGKILL') } catch { /* ignore */ }
      const log = `[timeout after ${timeout}s]`
      writeFileSync(join(outDir, `${name}.log`), log + '\n')
      resolve()
    }, timeout * 1000)

    proc.on('close', (code) => {
      clearTimeout(timer)
      let log = stdout || ''
      if (stderr) log += `\n[stderr]\n${stderr}`
      log += `\n[exit:${code ?? 'unknown'}]`
      writeFileSync(join(outDir, `${name}.log`), log.trim() + '\n')

      try { process.kill(-proc.pid!, 'SIGTERM') } catch { /* ignore */ }
      resolve()
    })

    proc.on('error', (e) => {
      clearTimeout(timer)
      writeFileSync(join(outDir, `${name}.log`), `[error: ${e.message}]\n`)
      resolve()
    })
  })

export const runMagic = async (): Promise<boolean> => {
  const runDir = join(config.workspace, '_run')
  if (!existsSync(runDir)) return false

  const scripts = readdirSync(runDir)
    .filter((f) => statSync(join(runDir, f)).isFile())
    .sort()

  if (scripts.length === 0) return false

  const outDir = join(config.workspace, '_output')
  if (existsSync(outDir)) rmSync(outDir, { recursive: true })
  mkdirSync(outDir)

  for (const name of scripts) {
    await runScript(join(runDir, name), outDir, name)
  }

  rmSync(runDir, { recursive: true })
  return true
}
