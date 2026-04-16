import { config } from './config.js'

export type Message = {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

type StreamChunk = {
  choices: readonly { delta: { content?: string | null } }[]
}

type CompletionResponse = {
  choices: readonly { message: { content: string | null } }[]
}

const streamResponse = async (response: Response): Promise<string> => {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data) as StreamChunk
        const token = chunk.choices[0]?.delta?.content ?? ''
        if (token) {
          process.stderr.write(token)
          result += token
        }
      } catch { /* ignore malformed SSE chunks */ }
    }
  }

  if (result) process.stderr.write('\n')
  return result
}

export const llm = async (messages: readonly Message[]): Promise<string> => {
  const stream = config.stream

  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      ...(stream ? { stream: true } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM API error ${response.status}: ${body}`)
  }

  if (stream) {
    return streamResponse(response)
  }

  const data = await response.json() as CompletionResponse
  return data.choices[0]?.message.content ?? ''
}
