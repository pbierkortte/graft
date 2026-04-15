import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fileAsAddition, compressHistory, SURVEY_MARKER } from './context.js'
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
