import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldGraft } from './graft.js'
import { fileAsAddition } from './context.js'
import type { Message } from './llm.js'

describe('shouldGraft', () => {
  it('returns false for small history', () => {
    const history: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'diff output' },
    ]
    assert.equal(shouldGraft(history), false)
  })

  it('returns true when history exceeds token threshold', () => {
    const bigContent = 'x'.repeat(500_000)
    const history: Message[] = [
      { role: 'user', content: bigContent },
    ]
    assert.equal(shouldGraft(history), true)
  })

  it('returns false at exactly the boundary', () => {
    const content = 'x'.repeat(399_999)
    const history: Message[] = [
      { role: 'user', content: content },
    ]
    assert.equal(shouldGraft(history), false)
  })
})

describe('fileAsAddition for graft context', () => {
  it('formats agent file as addition diff', () => {
    const result = fileAsAddition('.graft/agent.md', '# Test Agent')
    assert.ok(result.includes('--- /dev/null'))
    assert.ok(result.includes('+++ b/.graft/agent.md'))
    assert.ok(result.includes('+# Test Agent'))
  })

  it('formats session file as addition diff', () => {
    const result = fileAsAddition('.graft/session.md', 'user said hello')
    assert.ok(result.includes('+++ b/.graft/session.md'))
    assert.ok(result.includes('+user said hello'))
  })

  it('formats multi-line session correctly', () => {
    const session = 'msg one\n\n---\n\nmsg two\n\n---\n\nmsg three'
    const result = fileAsAddition('.graft/session.md', session)
    assert.ok(result.includes('+msg one'))
    assert.ok(result.includes('+msg two'))
    assert.ok(result.includes('+msg three'))
  })
})
