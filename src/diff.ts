import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config.js'

const NUDGE = '\n\n[Respond ONLY in unified diff format. No prose. No explanation.]'

export const isDiff = (text: string): boolean => {
  const trimmed = text.trim()
  if (!trimmed) return true
  const hasMinus = /^--- /m.test(trimmed)
  const hasPlus = /^(\+\+\+ |@@ )/m.test(trimmed)
  return hasMinus && hasPlus
}

export const stripFences = (text: string): string =>
  text
    .replace(/```\w*\n/g, '')
    .replace(/```/g, '')
    .trim()

export type ApplyResult = {
  readonly ok: boolean
  readonly error: string
}

export const applyDiff = (raw: string): ApplyResult => {
  const diff = stripFences(raw)
  if (!diff) return { ok: true, error: '' }

  const tmp = join(config.workspace, '.graft.tmp')
  writeFileSync(tmp, diff + '\n')

  try {
    for (const flag of [[], ['-p0']]) {
      try {
        execSync(
          ['git', 'apply', '--whitespace=nowarn', ...flag, tmp].join(' '),
          { cwd: config.workspace, stdio: 'pipe' }
        )
        return { ok: true, error: '' }
      } catch {
        // try next flag
      }
    }

    try {
      execSync(
        ['git', 'apply', '--whitespace=nowarn', tmp].join(' '),
        { cwd: config.workspace, stdio: 'pipe' }
      )
    } catch (e: unknown) {
      const err = e as { stderr?: Buffer }
      return { ok: false, error: err.stderr?.toString().trim() ?? 'patch failed' }
    }

    return { ok: false, error: 'patch failed' }
  } finally {
    try { unlinkSync(tmp) } catch { /* ignore */ }
  }
}

export const gitCommit = (msg: string): void => {
  execSync('git add -A', { cwd: config.workspace, stdio: 'pipe' })
  execSync(`git commit --allow-empty -m "${msg}"`, {
    cwd: config.workspace,
    stdio: 'pipe',
  })
}

export { NUDGE }
