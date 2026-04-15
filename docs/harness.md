# Harness

The runtime is a thin loop between the model and the filesystem.
Seven mechanisms compose the entire system.

## Mechanisms

### Validate

Check whether the model's response is a valid unified diff.
If not, nudge and retry. The nudge is never saved to history.
Invisible correction.

### Apply

Run `git apply` on the diff against the workspace.
Try `-p1` first, then `-p0`.
If the patch fails, feed the error back to the model for self-correction.

### Execute

Scripts placed in `_run/` get executed via bash in their own process group.
Output lands in `_output/`.
The `_run/` directory is consumed after execution to prevent re-runs.
Background processes are killed when the script finishes.
Scripts can declare their own timeout with `# timeout: <seconds>`.

### Survey

Read every tracked and untracked file in the workspace via `git ls-files`.
Produce a text snapshot.
Rebuilt every turn so the model always sees ground truth.
Respects `.gitignore` to control what the model sees.

### Amend

Staple the real workspace state onto the assistant's message in the transcript.
The model cannot gaslight itself across turns.

### Compress

Strip workspace surveys from older messages to manage context window growth.
The model always has the current state in the system prompt.
It does not need the full history of every past state.

### Loop

If something ran, inner turn. The model reacts to output.
If nothing ran, pass the mic back to the user.

## Flow

```
User                    Harness                   Model               Disk
  │                        │                        │                   │
  │──  user input  ───────▶│                        │                   │
  │                        │──[system+survey+hist]─▶│                   │
  │                        │◀──────unified diff─────│                   │
  │                        │──git apply────────────────────────────────▶│
  │                        │──bash _run/*.sh───────────────────────────▶│
  │                        │◀──────────────────────────stdout/stderr────│
  │                        │──survey()◀────────────────────────────────▶│
  │                        │──[amend + compress]    │                   │
  │                        │──[system+survey+hist]─▶│   (inner turn)   │
  │                        │◀──────unified diff─────│                   │
  │                        │──git apply────────────────────────────────▶│
  │                        │  (nothing ran)         │                   │
  │◀── done ──────────────│                        │                   │
```

## Properties

Every turn is a git commit. The commit log is the session history.
The harness does not know what it is building. It does not care.
It validates, applies, executes, surveys, amends, compresses.
The intelligence is upstream in the model and downstream on the disk.
