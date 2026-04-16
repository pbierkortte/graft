import { resolve } from 'node:path'

const env = (key: string, fallback: string): string =>
  process.env[key] ?? fallback

export const config = {
  workspace: resolve(env('GRAFT_WORKSPACE', './workspace')),
  agentFile: resolve(env('GRAFT_AGENT', './src/agent.md')),
  model: env('GRAFT_MODEL', 'gpt-5-mini'),
  apiKey: env('OPENAI_API_KEY', ''),
  apiBase: env('OPENAI_API_BASE', 'https://api.openai.com/v1'),
  execTimeout: parseInt(env('GRAFT_TIMEOUT', '30'), 10),
  historyWindow: parseInt(env('GRAFT_HISTORY', '20'), 10),
  stream: env('GRAFT_STREAM', 'true') !== 'false',
  maxRetries: 3,
  maxInner: 10,
} as const
