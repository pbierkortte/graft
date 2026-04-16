# Context

The model's entire world is a sequence of unified diffs.
What it receives is the same format as what it produces.

## Structure

The context window is assembled in this order:

1. System prompt: agent file content + workspace survey
2. Conversation history (user and assistant messages)

The system prompt is rebuilt every turn.
History is compressed as it grows (see below).

## Agent File

The first thing in the system prompt.
Contains the system identity, instructions, and constraints.
Read from `GRAFT_AGENT` (default `./src/agent.md`).
If the file is missing, a built-in default is used
that defines the diff-only response format and execution conventions.

## Workspace Survey

Appended to the system prompt after the agent file.
A text snapshot of every tracked and untracked file
produced by `git ls-files`. Rebuilt every turn
so the model always sees ground truth.

## User Input

User messages are natural language, not diffs.
They are pushed directly into the conversation history.
The model receives them as-is.

During grafting (context compression), all user messages
are joined into a session transcript and re-expressed
as a single diff addition. This is the only time
user input becomes a diff.

## Assistant Messages

Each assistant response (a unified diff) is stored in history
with the current workspace survey appended.
This means the model can see what the workspace looked like
after each of its own actions.

## History Compression

When the conversation has more than `GRAFT_HISTORY` (default 20)
assistant messages, older assistant messages have their
appended workspace surveys stripped and replaced with
`[workspace survey omitted]`. Message count stays the same;
content shrinks.

This is distinct from grafting, which replaces the entire history.
