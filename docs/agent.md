# Agent

The agent file is the system identity.
It is the first thing the model sees in its context.
Swap the file and you get a different agent
with different behavior, different personality, different capabilities
running on the same runtime.

## Role

The runtime is plumbing.
The agent file is where the real work happens.
It defines what the model should do, how it should behave,
and what conventions it should follow.

## Separation

The harness does not know what it is building.
It validates, applies, executes, surveys, amends, compresses.
The intelligence is upstream in the model
and downstream on the disk.
The agent file shapes the upstream.
The harness is just the wire between them.

## Format

The agent file is a plain text document.
It can contain instructions, personality, constraints, examples.
It is delivered to the model as an addition diff
at the start of the context window.
