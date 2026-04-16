# Docker

Run Graft in a container.

## Build

```bash
docker build -f docker/Dockerfile -t graft .
```

Image is based on `node:22-slim`.
Includes git, curl, jq, bash.
TypeScript compiles during build.

## Run

```bash
docker run -it -e OPENAI_API_KEY=sk-... graft
```

The container bootstraps a git workspace at `/graft/workspace`.
Each session starts with an empty repo.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | (none) | Required. API key for the LLM. |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | API endpoint. Any OpenAI-compatible API works. |
| `GRAFT_MODEL` | `gpt-5-mini` | Model name. |
| `GRAFT_WORKSPACE` | `./workspace` | Workspace directory inside container. |
| `GRAFT_AGENT` | `./agent.md` | Path to the agent file. |
| `GRAFT_TIMEOUT` | `30` | Default script timeout in seconds. |
| `GRAFT_HISTORY` | `20` | Turns before workspace surveys compress. |

## Persist Workspace

Mount a volume to keep the workspace across runs:

```bash
docker run -it \
  -e OPENAI_API_KEY=sk-... \
  -v $(pwd)/my-workspace:/graft/workspace \
  graft
```

## OpenAI-Compatible Providers

Works with OpenRouter, Azure OpenAI, local servers, or any provider
that implements the `/v1/chat/completions` endpoint:

```bash
# OpenRouter
docker run -it \
  -e OPENAI_API_KEY=$OPENROUTER_API_KEY \
  -e OPENAI_API_BASE=https://openrouter.ai/api/v1 \
  -e GRAFT_MODEL=openai/gpt-5-mini \
  graft
```

## Custom Agent

Mount a custom agent file:

```bash
docker run -it \
  -e OPENAI_API_KEY=sk-... \
  -v $(pwd)/my-agent.md:/graft/agent.md:ro \
  graft
```

## What's in the Image

- Node.js 22
- git (for workspace, diff apply, commits)
- curl, jq (available to _run/ scripts)
- bash (script execution)
- Compiled TypeScript in `/graft/dist/`
- No agent file bundled — mount one at runtime (see Custom Agent above)
