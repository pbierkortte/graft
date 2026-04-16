# Survey

The workspace is a git repo.
The survey reads every tracked and untracked file
using `git ls-files` and produces a text snapshot.

## Mechanism

Rebuilt every turn so the model always sees ground truth.
The snapshot is stapled onto the assistant's message in the transcript.
The model cannot gaslight itself across turns.

## Visibility Control

`.gitignore` controls what the model sees.
Add entries there to hide files from the model.
One mechanism, not two.

```gitignore
*.pyc
data/
node_modules/
model.pt
```

## Truncation

Files larger than 5KB are truncated in the survey:
first 2000 characters, then `[…truncated, N bytes total…]`,
then last 500 characters. Binary files show only their name and size.

## Context Pressure

The survey is embedded in the system prompt.
After approximately 40 files or 20K tokens of source,
context window pressure becomes real.
This is the scaling wall.

For large projects, structure work so the workspace stays focused.
Use `.gitignore` to hide what the model does not need.
Use scripts to pull in external resources
rather than keeping everything in the tree.

## Deduplication

The survey is hashed after each turn.
If the workspace has not changed, the next assistant message
receives `[workspace unchanged]` instead of the full survey.
This eliminates redundant token spend when the workspace is stable.

When the workspace changes, the full survey is included again automatically.

## Compression

Workspace surveys from older messages are stripped
to manage context window growth.
The model always has the current state.
It does not need the full history of every past state.
