# Graft

A diff-native agentic runtime.
The model receives diffs. The model produces diffs.
The filesystem is state. Git is memory. Bash is the universal tool.

## Quick Start

```bash
npm install
npm run build
OPENAI_API_KEY=sk-... node dist/index.js
```

Or with Docker:

```bash
docker build -f src/Dockerfile -t graft .
docker run -it -e OPENAI_API_KEY=sk-... graft
```

## How It Works

The system prompt contains the agent file and a workspace survey.
The conversation history holds user messages (natural language)
and assistant messages (unified diffs).
When context fills up, graft: flatten everything
to fresh additions and continue.
The world state is preserved. The history is not.

## Docs

- [Architecture](architecture.md) — context as diffs, compression, grafting
- [Context](context.md) — what the model sees, the prompt structure
- [Grafting](grafting.md) — context compression by flattening
- [Agent](agent.md) — the system identity file
- [Harness](harness.md) — the eight mechanisms and the runtime loop
- [Diffs](diffs.md) — why unified diffs as the protocol
- [Execution](execution.md) — script conventions, process isolation, capabilities
- [Survey](survey.md) — workspace observation, visibility control, context pressure
- [Docker](docker.md) — container setup, environment, usage
- [Config](config.md) — environment variables and hard-coded defaults

## Development

```bash
npm install
npm test        # 22 tests, node:test runner
npm run dev     # tsx hot reload
npm run build   # tsc → dist/
```

## License

GPL-3.0-or-later
