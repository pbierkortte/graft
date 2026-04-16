import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileAsAddition, compressHistory, amendWithSurvey, resetSurveyHash, SURVEY_MARKER } from './context.js'
import type { Message } from './llm.js'

describe('fileAsAddition', () => {
  it('creates a valid addition diff', () => {
    const result = fileAsAddition('hello.txt', 'hello\nworld')
    assert.ok(result.includes('--- /dev/null'))
    assert.ok(result.includes('+++ b/hello.txt'))
    assert.ok(result.includes('@@ -0,0 +1,2 @@'))
    assert.ok(result.includes('+hello'))
    assert.ok(result.includes('+world'))
  })

  it('handles single-line content', () => {
    const result = fileAsAddition('one.txt', 'single line')
    assert.ok(result.includes('@@ -0,0 +1,1 @@'))
    assert.ok(result.includes('+single line'))
  })
})

describe('compressHistory', () => {
  const makeHistory = (n: number): Message[] => {
    const msgs: Message[] = []
    for (let i = 0; i < n; i++) {
      msgs.push({ role: 'user', content: `input ${i}` })
      msgs.push({
        role: 'assistant',
        content: `response ${i}${SURVEY_MARKER}survey data ${i}`,
      })
    }
    return msgs
  }

  it('does not compress when within window', () => {
    const history = makeHistory(5)
    const compressed = compressHistory(history)
    assert.equal(compressed.length, history.length)
    assert.ok(compressed[1].content.includes(SURVEY_MARKER))
  })

  it('strips old surveys beyond window', () => {
    const history = makeHistory(30)
    const compressed = compressHistory(history)

    const oldAssistant = compressed[1]
    assert.ok(oldAssistant.content.includes('[workspace survey omitted]'))
    assert.ok(!oldAssistant.content.includes(SURVEY_MARKER))

    const recentAssistant = compressed[compressed.length - 1]
    assert.ok(recentAssistant.content.includes(SURVEY_MARKER))
  })

  it('preserves message count', () => {
    const history = makeHistory(30)
    const compressed = compressHistory(history)
    assert.equal(compressed.length, history.length)
  })
})

describe('amendWithSurvey', () => {
  // amendWithSurvey uses survey() which calls git ls-files on config.workspace.
  // config.workspace is resolved at module load time, so we use a temp git repo
  // and pass it explicitly to survey() via the workspace parameter.
  // We test the dedup logic by calling amendWithSurvey twice in the same state.
  let ws: string

  before(() => {
    ws = mkdtempSync(join(tmpdir(), 'graft-ctx-'))
    execSync('git init', { cwd: ws, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: ws, stdio: 'pipe' })
    execSync('git config user.name "Test"', { cwd: ws, stdio: 'pipe' })
  })

  after(() => {
    rmSync(ws, { recursive: true, force: true })
  })

  beforeEach(() => {
    resetSurveyHash()
  })

  it('always includes SURVEY_MARKER in output', () => {
    const result = amendWithSurvey('diff output', ws)
    assert.ok(result.includes(SURVEY_MARKER), 'Should always include survey marker')
    assert.ok(result.startsWith('diff output'), 'Should start with response')
  })

  it('returns [workspace unchanged] on second consecutive call', () => {
    amendWithSurvey('first', ws)
    const result = amendWithSurvey('second', ws)
    assert.ok(result.includes('[workspace unchanged]'), `Expected dedup on second call, got: ${result}`)
  })

  it('does not dedup after resetSurveyHash', () => {
    amendWithSurvey('first', ws)
    resetSurveyHash()
    const result = amendWithSurvey('second', ws)
    assert.ok(!result.includes('[workspace unchanged]'), 'After reset, should include full survey')
  })
})
