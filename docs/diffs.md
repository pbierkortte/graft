# Why Diffs

Every foundation model release touts code benchmarks first.
Billions of dollars of training compute are poured into making models
better at producing syntactically correct, contextually appropriate code.

A unified diff is code.
Arguably the most constrained form of it.
A strict format with explicit context lines, line counts, and file paths.
The output format of `git diff`, which appears millions of times
in the training data of every major model.

The system does not fight the model.
It does not ask for structured JSON tool calls,
function signature registries, or internal state representations.
It asks the model to do what it is best at,
in a format it has seen a billion times.

## Three Constraints in One

1. Plays to the model's strongest capability: code generation
2. Provides a structured, parseable, applicable output format: no custom parsing
3. Makes every action visible and auditable: it is just a git history

## Self-Correction

When a diff fails to apply (malformed hunks, wrong context lines,
off-by-one line counts) the error is fed back to the model.
It sees what went wrong and gets another shot.
The system does not silently swallow failures
or leave the model guessing why its changes did not appear.

## Future-Proof

Every model that ships from now on will be better at code.
Better at diffs. Better at reasoning about filesystems and shell commands.
The system captures 100% of that improvement automatically.
No migration. No version bump. No refactor.
Just a new model name in an environment variable and everything gets better.
