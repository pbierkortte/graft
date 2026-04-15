# Grafting

What happens when the context runs out of space.

## The Problem

The model accumulates diffs over a session.
Each turn adds patches, modifications, back and forth.
Eventually the context window fills up.

## The Mechanism

At any point, compress by flattening.

Take the current state of every file
and express them all as fresh additions.
As if starting from an empty workspace.

The agent file stays the same.
The supporting documents stay the same.
Every workspace file becomes a new addition.
All incremental patch history is dropped.

Then the user file appears at the end,
formatted as a patch showing the next increment.

## What Changes

Before grafting:

```
agent file (addition)
supporting docs (additions)
file A (addition)
file A (patch: first edit)
file A (patch: second edit)
file B (addition)
file B (patch: edit)
user file (patch: turn 1)
user file (patch: turn 2)
user file (patch: turn 3)
...context full...
```

After grafting:

```
agent file (addition)
supporting docs (additions)
file A (addition — current state)
file B (addition — current state)
user file (patch: new input)
```

## Properties

Nothing is lost from the model's perspective.
It sees the same files with the same contents.
The history of how those files got there is gone
but the files themselves are intact.

This is a graft in the git sense.
The history is cut at a point
and a new root is created.
The world state is preserved.
The accumulated weight is not.

## The User File

After a graft, the user file resets to its current content
expressed as an addition.
The next user input arrives as a patch on top of that.

The model always sees what was said before
plus what is being said now.
The structure never changes.
Only the depth of history behind it.
