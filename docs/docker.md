# Docker

Run Graft in a container.

## Build

```bash
docker build -t graft .
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
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | API endpoint. |
| `GRAFT_MODEL` | `gpt-4o` | Model name. |
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
- Default agent file at `/graft/agent.md`
