import { config } from './config.js'

export type Message = {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

export const llm = async (messages: readonly Message[]): Promise<string> => {
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
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM API error ${response.status}: ${body}`)
  }

  const data = await response.json() as {
    choices: readonly { message: { content: string | null } }[]
  }

  return data.choices[0]?.message.content ?? ''
}
