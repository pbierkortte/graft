import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { config } from './config.js'
import { llm, type Message } from './llm.js'
import { isDiff, applyDiff, gitCommit, NUDGE } from './diff.js'
import { runMagic } from './execute.js'
import { buildMessages, amendWithSurvey } from './context.js'
import { shouldGraft, graftHistory } from './graft.js'

const validatedLlm = async (messages: readonly Message[]): Promise<string> => {
  for (let i = 0; i < config.maxRetries; i++) {
    const resp = await llm(messages)
    if (isDiff(resp)) return resp

    const nudged = messages.map((m) => ({ ...m }))
    for (let j = nudged.length - 1; j >= 0; j--) {
      if (nudged[j].role === 'user') {
        nudged[j] = { ...nudged[j], content: nudged[j].content + NUDGE }
        break
      }
    }

    const resp2 = await llm(nudged)
    if (isDiff(resp2)) return resp2
  }

  return ''
}

export const bootstrap = (workspace: string = config.workspace): void => {
  mkdirSync(workspace, { recursive: true })

  if (!existsSync(join(workspace, '.git'))) {
    execSync('git init', { cwd: workspace, stdio: 'pipe' })
    execSync('git commit --allow-empty -m "init"', {
      cwd: workspace,
      stdio: 'pipe',
    })
  }
}

export const main = async (): Promise<void> => {
  bootstrap()

  console.log('╭───────────────────────────────────╮')
  console.log('│  Graft                            │')
  console.log('│  You speak free. I speak diff.    │')
  console.log('│  Type \'quit\' to exit.             │')
  console.log('╰───────────────────────────────────╯\n')

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const prompt = (): Promise<string | null> =>
    new Promise((resolve) => {
      rl.question('> ', (answer) => resolve(answer?.trim() ?? null))
      rl.once('close', () => resolve(null))
    })

  const history: Message[] = []

  while (true) {
    const userInput = await prompt()

    if (userInput === null) break
    if (['q', 'quit', 'exit'].includes(userInput.toLowerCase())) break
    if (!userInput) continue

    history.push({ role: 'user', content: userInput })

    for (let turn = 0; turn < config.maxInner; turn++) {
      if (shouldGraft(history)) {
        console.log('[grafting — compressing context]')
        const { history: grafted } = graftHistory(history, '')
        history.length = 0
        history.push(...grafted)
      }

      const messages = buildMessages(history)

      let response: string
      try {
        response = await validatedLlm(messages)
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e)
        console.log(`\n[error: ${err}]\n`)
        break
      }

      if (response.trim()) {
        console.log(`\n${response}\n`)
      } else {
        console.log('\n(no changes)\n')
      }

      const { ok, error } = applyDiff(response)

      if (!ok) {
        console.log(`[patch failed: ${error}]`)
        history.push({ role: 'assistant', content: response })
        history.push({
          role: 'user',
          content: `[patch failed]\n${error}\n\nFix the diff and resubmit.`,
        })
        continue
      }

      const ran = await runMagic()

      gitCommit(`turn-${history.length}`)

      history.push({
        role: 'assistant',
        content: amendWithSurvey(response, config.workspace),
      })

      if (!ran) break

      history.push({
        role: 'user',
        content: '[execution complete — results in _output/. continue or be silent.]',
      })
    }
  }

  rl.close()
  console.log(`\nWorkspace: ${config.workspace}`)
}
