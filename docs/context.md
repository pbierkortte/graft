# Context

The model's entire world is a sequence of unified diffs.
What it receives is the same format as what it produces.

## Structure

The context window is assembled in this order:

1. Agent file as an addition diff
2. Supporting documents as addition diffs
3. All workspace files as addition diffs
4. User file as a patch

Every section is a valid unified diff.
The model reads diffs and writes diffs.
There is no mode switch between input and output.

## Agent File

The first thing in the context.
Always formatted as an addition from `/dev/null`.
Contains the system identity, instructions, and constraints.

## Supporting Documents

Reference material the model needs to do its work.
Each is an addition from `/dev/null`.
These provide grounding without being part of the workspace.

## Workspace Files

Every file in the current workspace expressed as an addition.
This is the ground truth of what exists on disk.
The model sees everything as if it were freshly created.

## User File

The last thing in the context.
Contains accumulated user input from the session.
Formatted as a patch showing what was said before
plus what is being said now.

If the user provides multiple inputs over time,
each new input extends the file via a hunk
that adds lines to the end.

The user file is always last
so the model reads its identity and context first,
then sees the current request.
