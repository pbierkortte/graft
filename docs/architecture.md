# Architecture

## Context as Diffs

The model receives its entire world as a sequence of unified diffs.
Every file it sees is expressed as an addition, a modification, or a deletion.
The same format it produces is the format it consumes.

## Context Structure

The system prompt contains:

1. **Agent file** — system identity and instructions
2. **Workspace survey** — text snapshot of all tracked/untracked files

The conversation history contains user messages (natural language)
and assistant messages (unified diffs with workspace surveys appended).

During grafting, the entire history is replaced with a single message
where every file is re-expressed as a fresh addition.

## Compression (Grafting)

When context approaches its limit, the system compresses:

- Take the current state of all files
- Express everything as fresh additions (as if starting from empty)
- Drop all incremental patch history
- Append the user file at the end with the next input as a new patch

This is a graft in the git sense.
History is cut at a point and a new root is created.
The model sees the same world state but without accumulated weight.
Nothing is lost. The files are the memory.

## Properties

- Session continuity through file contents, not message history
- Context overflow handled by flattening, not truncating
- The model never needs to remember — it reads current state
- Every action is a diff, every state is a set of additions
