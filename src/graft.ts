import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { config } from './config.js'
import { fileAsAddition } from './context.js'
import type { Message } from './llm.js'

const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4)

const workspaceFiles = (): { path: string; content: string }[] => {
  const result = execSync(
    'git ls-files --cached --others --exclude-standard',
    { cwd: config.workspace, encoding: 'utf-8' }
  )

  return result.trim().split('\n').filter(Boolean).sort().flatMap((rel) => {
    const full = join(config.workspace, rel)
    try {
      const content = readFileSync(full, 'utf-8')
      return [{ path: rel, content }]
    } catch {
      return []
    }
  })
}

export const workspaceAsAdditions = (): string => {
  const files = workspaceFiles()
  return files.map(({ path, content }) => fileAsAddition(path, content)).join('\n\n')
}

export const buildDiffContext = (
  agentContent: string,
  userSession: string,
): string => {
  const parts: string[] = []

  parts.push(fileAsAddition('.graft/agent.md', agentContent))

  const files = workspaceFiles()
  for (const { path, content } of files) {
    parts.push(fileAsAddition(path, content))
  }

  if (userSession) {
    parts.push(fileAsAddition('.graft/session.md', userSession))
  }

  return parts.join('\n\n')
}

export const shouldGraft = (history: Message[]): boolean => {
  const total = history.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  return total > 100_000
}

export const graftHistory = (
  history: Message[],
  agentContent: string,
): { history: Message[]; userSession: string } => {
  const userMessages = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)

  const userSession = userMessages.join('\n\n---\n\n')

  const context = buildDiffContext(agentContent, userSession)

  return {
    history: [
      { role: 'user', content: context },
    ],
    userSession,
  }
}
