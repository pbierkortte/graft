import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { llm } from './llm.js'
import type { Message } from './llm.js'

const MESSAGES: readonly Message[] = [
  { role: 'user', content: 'hello' },
]

const makeFetchResponse = (status: number, body: unknown): Response => {
  const json = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => json,
    json: async () => body,
  } as unknown as Response
}

describe('llm', () => {
  beforeEach(() => {
    mock.restoreAll()
  })

  it('returns content from a successful response', async () => {
    mock.method(globalThis, 'fetch', async () =>
      makeFetchResponse(200, {
        choices: [{ message: { content: 'diff output' } }],
      })
    )
    const result = await llm(MESSAGES)
    assert.equal(result, 'diff output')
  })

  it('returns empty string when choices is empty', async () => {
    mock.method(globalThis, 'fetch', async () =>
      makeFetchResponse(200, { choices: [] })
    )
    const result = await llm(MESSAGES)
    assert.equal(result, '')
  })

  it('returns empty string when message content is null', async () => {
    mock.method(globalThis, 'fetch', async () =>
      makeFetchResponse(200, {
        choices: [{ message: { content: null } }],
      })
    )
    const result = await llm(MESSAGES)
    assert.equal(result, '')
  })

  it('throws on non-200 response', async () => {
    mock.method(globalThis, 'fetch', async () =>
      makeFetchResponse(400, 'Bad Request')
    )
    await assert.rejects(
      () => llm(MESSAGES),
      (err: Error) => {
        assert.ok(err.message.includes('400'), `Expected 400 in error, got: ${err.message}`)
        return true
      }
    )
  })

  it('throws on 500 server error', async () => {
    mock.method(globalThis, 'fetch', async () =>
      makeFetchResponse(500, 'Internal Server Error')
    )
    await assert.rejects(
      () => llm(MESSAGES),
      (err: Error) => {
        assert.ok(err.message.includes('500'), `Expected 500 in error, got: ${err.message}`)
        return true
      }
    )
  })

  it('throws on network error', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('network failure')
    })
    await assert.rejects(
      () => llm(MESSAGES),
      /network failure/
    )
  })

  it('throws on malformed JSON response', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      text: async () => 'not json',
      json: async () => { throw new SyntaxError('Unexpected token') },
    } as unknown as Response))
    await assert.rejects(
      () => llm(MESSAGES),
      (err: Error) => {
        assert.ok(err instanceof SyntaxError, `Expected SyntaxError, got: ${err.constructor.name}`)
        return true
      }
    )
  })

  it('sends correct request structure', async () => {
    let capturedBody: unknown
    mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string)
      return makeFetchResponse(200, {
        choices: [{ message: { content: 'ok' } }],
      })
    })
    await llm(MESSAGES)
    const body = capturedBody as { messages: unknown; temperature: number }
    assert.ok(Array.isArray(body.messages), 'messages should be an array')
    assert.equal(typeof body.temperature, 'number', 'temperature should be a number')
  })
})
