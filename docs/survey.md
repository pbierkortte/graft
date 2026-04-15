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

## Context Pressure

The survey is embedded in the system prompt.
After approximately 40 files or 20K tokens of source,
context window pressure becomes real.
This is the scaling wall.

For large projects, structure work so the workspace stays focused.
Use `.gitignore` to hide what the model does not need.
Use scripts to pull in external resources
rather than keeping everything in the tree.

## Compression

Workspace surveys from older messages are stripped
to manage context window growth.
The model always has the current state.
It does not need the full history of every past state.
