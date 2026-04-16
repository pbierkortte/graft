# Workflow

The loop for addressing an issue:

**triage → branch → fix → test → commit → push → PR → merge → verify → docs**

## Triage

```bash
gh issue list --state open
gh issue view <N>
```

Read the issue. Read the relevant source and docs. Decide if it is fixable or closeable.

## Branch

```bash
git checkout master && git pull
git checkout -b fix/<slug>
```

Use `fix/` for bug fixes, `docs/` for documentation-only changes.

## Fix

Make targeted changes. Prefer small, focused edits over large rewrites.
Docs first when the change touches both code and documentation.

## Test

```bash
npm test
```

For infrastructure changes (Dockerfile, etc.), also verify the build:

```bash
docker build -f src/Dockerfile -t graft .
docker run --rm graft <smoke-test-command>
```

## Commit

Commit incrementally. One logical change per commit. Keep messages terse.

```
fix: <what changed and why in one line>
docs: <what was documented>
```

## Push and PR

```bash
git push -u origin <branch>
gh pr create --title "..." --body "Fixes #N\n\n..." --base master
```

Include `Fixes #N` in the PR body to auto-close the issue on merge.

## Merge

```bash
gh pr merge <N> --squash --delete-branch
```

## Verify

```bash
gh issue view <N> --json state    # should be CLOSED
gh issue list --state open        # confirm remaining work
npm test                          # should still be green
```

## Docs

Check whether any documentation needs updating after the change.
`docs/` mirrors the code — keep them in sync.
