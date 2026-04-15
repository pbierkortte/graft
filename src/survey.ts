import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config.js'

export const survey = (): string => {
  const result = execSync(
    'git ls-files --cached --others --exclude-standard',
    { cwd: config.workspace, encoding: 'utf-8' }
  )

  const parts: string[] = []

  for (const rel of result.trim().split('\n').filter(Boolean).sort()) {
    const path = join(config.workspace, rel)

    try {
      const stat = statSync(path)
      if (!stat.isFile()) continue
    } catch {
      continue
    }

    try {
      let text = readFileSync(path, 'utf-8')
      if (text.length > 5000) {
        text = text.slice(0, 2000)
          + `\n[…truncated, ${text.length} bytes total…]\n`
          + text.slice(-500)
      }
      parts.push(`=== ${rel} ===\n${text}`)
    } catch {
      try {
        const size = statSync(path).size
        parts.push(`=== ${rel} (binary, ${size}b) ===`)
      } catch {
        parts.push(`=== ${rel} (unreadable) ===`)
      }
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : '(empty workspace)'
}
