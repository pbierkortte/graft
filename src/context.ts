import { readFileSync, existsSync } from 'node:fs'
import { config } from './config.js'
import { survey } from './survey.js'
import type { Message } from './llm.js'

const SURVEY_MARKER = '\n\n[workspace]\n'

const fileAsAddition = (path: string, content: string): string => {
  const lines = content.split('\n')
  const count = lines.length
  const added = lines.map((l) => `+${l}`).join('\n')
  return `--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${count} @@\n${added}`
}

const DEFAULT_AGENT = `# Graft

You respond ONLY in unified diff format.

## Format
- New file:     \`--- /dev/null\` then \`+++ b/path\`
- Edit file:    \`--- a/path\`   then \`+++ b/path\` with @@ hunks
- Delete file:  diff that removes all content
- Multiple files: concatenate diffs

## Execution
- Create \`_run/<name>.sh\` to run a shell command.
- Output appears in \`_output/<name>.sh.log\` automatically.
- After execution you get another turn to see results and react.
- When done, respond with silence (empty output).
- For long-running scripts, add \`# timeout: <seconds>\` in the first 3 lines.

## Rules
- No prose. No explanation. Only diffs.
- Silence means nothing to change.
- If your patch fails, you'll see the error. Fix and resubmit.
`

const readAgent = (): string => {
  if (existsSync(config.agentFile)) {
    return readFileSync(config.agentFile, 'utf-8')
  }
  return DEFAULT_AGENT
}

export const buildSystemPrompt = (): string => {
  const agent = readAgent()
  const ws = survey()
  return `${agent}\n\n# Current Workspace\n\n${ws}`
}

export const compressHistory = (history: Message[]): Message[] => {
  const assistantIndices = history
    .map((m, i) => m.role === 'assistant' ? i : -1)
    .filter((i) => i >= 0)

  if (assistantIndices.length <= config.historyWindow) return history

  const cutoff = assistantIndices[assistantIndices.length - config.historyWindow]

  return history.map((msg, i) => {
    if (
      msg.role === 'assistant'
      && i < cutoff
      && msg.content.includes(SURVEY_MARKER)
    ) {
      const trimmed = msg.content.slice(0, msg.content.indexOf(SURVEY_MARKER))
      return { role: msg.role, content: trimmed + '\n\n[workspace survey omitted]' }
    }
    return msg
  })
}

export const buildMessages = (history: Message[]): Message[] => [
  { role: 'system' as const, content: buildSystemPrompt() },
  ...compressHistory(history),
]

export const amendWithSurvey = (response: string): string =>
  response + SURVEY_MARKER + survey()

export { SURVEY_MARKER, fileAsAddition }
