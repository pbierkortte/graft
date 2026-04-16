import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { llm } from './llm.js'
import type { Message } from './llm.js'

const MESSAGES: readonly Message[] = [
  { role: 'user', content: 'hello' },
]

// Build a ReadableStream that emits SSE chunks for streaming responses
const makeSSEStream = (chunks: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

const makeStreamResponse = (content: string): Response => {
  const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`
  return {
    ok: true,
    status: 200,
    body: makeSSEStream([sseData]),
    text: async () => '',
    json: async () => { throw new Error('should not call json() in stream mode') },
  } as unknown as Response
}

const makeEmptySSEStream = (): Response => {
  const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: null } }] })}\n\ndata: [DONE]\n\n`
  return {
    ok: true,
    status: 200,
    body: makeSSEStream([sseData]),
    text: async () => '',
    json: async () => { throw new Error('should not call json() in stream mode') },
  } as unknown as Response
}

const makeErrorResponse = (status: number, body: string): Response => ({
  ok: false,
  status,
  body: null,
  text: async () => body,
  json: async () => { throw new Error('should not call json() on error') },
} as unknown as Response)

describe('llm', () => {
  beforeEach(() => {
    mock.restoreAll()
  })

  it('returns content from a successful streaming response', async () => {
    mock.method(globalThis, 'fetch', async () => makeStreamResponse('diff output'))
    const result = await llm(MESSAGES)
    assert.equal(result, 'diff output')
  })

  it('returns empty string when delta content is null', async () => {
    mock.method(globalThis, 'fetch', async () => makeEmptySSEStream())
    const result = await llm(MESSAGES)
    assert.equal(result, '')
  })

  it('returns empty string when SSE stream has no content chunks', async () => {
    const sseData = 'data: [DONE]\n\n'
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      body: makeSSEStream([sseData]),
      text: async () => '',
    } as unknown as Response))
    const result = await llm(MESSAGES)
    assert.equal(result, '')
  })

  it('throws on non-200 response', async () => {
    mock.method(globalThis, 'fetch', async () => makeErrorResponse(400, 'Bad Request'))
    await assert.rejects(
      () => llm(MESSAGES),
      (err: Error) => {
        assert.ok(err.message.includes('400'), `Expected 400 in error, got: ${err.message}`)
        return true
      }
    )
  })

  it('throws on 500 server error', async () => {
    mock.method(globalThis, 'fetch', async () => makeErrorResponse(500, 'Internal Server Error'))
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

  it('handles malformed SSE chunks gracefully (ignores them)', async () => {
    // Malformed JSON in SSE data should be silently ignored
    const sseData = 'data: not-valid-json\n\ndata: [DONE]\n\n'
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      body: makeSSEStream([sseData]),
      text: async () => '',
    } as unknown as Response))
    // Should not throw — malformed chunks are skipped
    const result = await llm(MESSAGES)
    assert.equal(result, '')
  })

  it('sends correct request structure', async () => {
    let capturedBody: unknown
    mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string)
      return makeStreamResponse('ok')
    })
    await llm(MESSAGES)
    const body = capturedBody as { messages: unknown; temperature: number; stream: boolean }
    assert.ok(Array.isArray(body.messages), 'messages should be an array')
    assert.equal(typeof body.temperature, 'number', 'temperature should be a number')
    assert.equal(body.stream, true, 'stream should be true by default')
  })

  it('accumulates multiple SSE chunks into a single response', async () => {
    // Simulate tokens arriving in separate SSE events
    const chunk1 = `data: ${JSON.stringify({ choices: [{ delta: { content: 'hello' } }] })}\n\n`
    const chunk2 = `data: ${JSON.stringify({ choices: [{ delta: { content: ' world' } }] })}\n\n`
    const done = 'data: [DONE]\n\n'
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      body: makeSSEStream([chunk1, chunk2, done]),
      text: async () => '',
    } as unknown as Response))
    const result = await llm(MESSAGES)
    assert.equal(result, 'hello world')
  })
})
