# Config

All configuration lives in `src/config.ts`.
Environment variables with sensible defaults.
No config files. No CLI flags.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `GRAFT_WORKSPACE` | `./workspace` | Working directory. Must be or become a git repo. |
| `GRAFT_AGENT` | `./src/agent.md` | System identity file. Falls back to built-in default if missing. |
| `GRAFT_MODEL` | `gpt-5-mini` | Model name sent to the API. |
| `OPENAI_API_KEY` | _(empty)_ | API key. Required for any LLM call. |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | Base URL. Any OpenAI-compatible endpoint works. |
| `GRAFT_TIMEOUT` | `30` | Default script execution timeout in seconds. |
| `GRAFT_HISTORY` | `20` | Number of recent assistant messages that keep full workspace surveys. |
| `GRAFT_STREAM` | `true` | Stream LLM output token-by-token to stderr. Set to `false` to disable. |

## Hard-Coded Values

| Name | Value | Location | Purpose |
|---|---|---|---|
| `maxRetries` | `3` | `config.ts` | LLM validation retry attempts per turn. |
| `maxInner` | `10` | `config.ts` | Maximum inner turns per user input. |
| `temperature` | `0.7` | `llm.ts` | LLM sampling temperature. |
| `AbortSignal.timeout` | `120000` | `llm.ts` | HTTP request timeout (2 minutes). |
| `shouldGraft` threshold | `100000` | `graft.ts` | Token estimate above which grafting triggers. |
| Token estimate | word/whitespace split | `graft.ts` | Regex-based token approximation (`/\S+|\s+/g`). |
| Survey truncation | `5000` chars | `survey.ts` | Files above this size are truncated. |

## Provider Examples

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-... node dist/index.js

# OpenRouter
OPENAI_API_KEY=$OPENROUTER_API_KEY \
OPENAI_API_BASE=https://openrouter.ai/api/v1 \
GRAFT_MODEL=openai/gpt-5-mini \
node dist/index.js

# Local (e.g. ollama)
OPENAI_API_KEY=unused \
OPENAI_API_BASE=http://localhost:11434/v1 \
GRAFT_MODEL=llama3 \
node dist/index.js
```
