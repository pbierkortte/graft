# git-as-chat-as-agent-harness-idea

*A minimal mbox-shaped chat protocol built entirely on git, extended into a capability-separated multi-agent harness.*


---

**TL;DR**

A git repo is a multi-actor chat where every message is a commit.

**Three actors, one rule each:**
- **Humans** — commit text (empty commits)
- **LLMs** — commit text + edit files, but *cannot execute anything*
- **Charlie** (executor) — can execute, but rarely speaks (say for llm reminder nudging), only commits file changes (most iwth empty commit message)

**The repo has two special files:**
- `core.md` — immutable soul/constitution. Charlie reverts any change to it.
- `script.sh` — the *only* execution surface. LLMs write commands here. Charlie runs it, drops output in `runs/`, resets it to empty.

**The loop:**
1. Human asks → LLM responds (may edit `script.sh`)
2. Charlie sees non-empty `script.sh` → runs it in a Docker sandbox (`--network none`) → if anything changed, commits the file diffs silently
3. If output/changes → mic goes back to the LLM (tool-call loop continues)
4. If nothing changed / `script.sh` empty → mic returns to human

**The whole stack:**
- **Protocol** = `git log` + `git commit`
- **DB** = the repo itself
- **TUI** = thin wrapper around the git API (reads `git log`, writes `git commit`)
- **Security** = LLMs get append-only push; Charlie runs in Docker with no network
- **Context** = standard sliding window / summarization commits — git already handles everything else (timestamps, sync, dedup, branches)

LLMs see it as a normal mbox/email thread — a format they already handle well.



---

## The thesis, in one sentence

**What if a chat conversation were literally a git log?** Pull that string far enough and you get a minimal mbox transcript, then git-as-chat, then git-as-chat-as-agent-harness with a cleanly separated execution tier. No servers. No protocols to design. Just git, a shell loop, and a TUI.

---

## 1. The minimal transcript format

The format we simplify toward:

```
From: <name>
Date: <rfc2822>
Subject: <line>

<body>
```

…one block per message, blank line between. That's it.

### Reproducing it with stock git (zero custom tooling)

```bash
git log --reverse --pretty=format:'From: %an%nDate: %aD%nSubject: %s%n%n%b'
```

Tokens: `%an` author, `%aD` RFC-2822 date, `%s` subject, `%b` body, `%n` newline.

Alias it once in `~/.gitconfig`:

```ini
[pretty]
    mbox = format:From: %an%nDate: %aD%nSubject: %s%n%n%b
```

Then the "read the thread" command is just:

```bash
git log --reverse --pretty=mbox
```

And the "send a message" command is:

```bash
git commit --allow-empty -m "<subject>" -m "<body>"
```

**That's the entire protocol.** Two commands.

### Adjacent formats on the same axis

| you want | command |
|---|---|
| classic `git log` | (no flags) |
| compact IDs | `--oneline` |
| minimal mbox | `--pretty=format:'From: %an%nDate: %aD%nSubject: %s%n%n%b'` |
| mbox + patches (`git am` target) | `git format-patch --stdout --no-signature --no-stat` |
| mbox + what changed | `--name-status` |
| mbox + +/- counts | `--shortstat` |
| mbox + diffstat bars | `--stat` |
| mbox + full diffs | `-p` / `--patch` |

Key property: **all `--foo` flags compose with the same `--pretty=format:` string.** The transcript shape is preserved; file detail is opt-in, opt-out.

---

## 2. Git as chat

Two or more identities commit to the same branch. Empty commits if it's pure text; commits touching files if the message carries changes. Each commit is a message. `user.name` / `user.email` = author attribution. Subject = title. Body = message.

```bash
git init garden-chat && cd garden-chat

# seed (use a neutral identity, not your personal one)
git -c user.name=garden -c user.email=garden@local commit --allow-empty -m "root"

# ada speaks
git -c user.name=ada -c user.email=ada@garden.local commit --allow-empty \
    -m "tomatoes or peppers?" \
    -m "Bed 3 is ready. I'm leaning tomatoes. Thoughts?"

# rook replies
git -c user.name=rook -c user.email=rook@garden.local commit --allow-empty \
    -m "Re: tomatoes or peppers?" \
    -m "Peppers — fence shades bed 3. Tomatoes in bed 5 instead."
```

Render it:

```
From: ada
Date: Sat, 18 Apr 2026 09:12:04 -0400
Subject: tomatoes or peppers?

Bed 3 is ready. I'm leaning tomatoes. Thoughts?

From: rook
Date: Sat, 18 Apr 2026 09:18:41 -0400
Subject: Re: tomatoes or peppers?

Peppers — fence shades bed 3. Tomatoes in bed 5 instead.
```

### What you get for free

| property | from |
|---|---|
| author attribution | `user.name` / `user.email` |
| crypto-signed messages | `-S` |
| timestamps | author + committer dates |
| search/filter | `--author` `--since` `--grep` |
| threading | commit parents = "in-reply-to"; branches = side chats; merges rejoin them |
| attachments | a commit that touches files; next one goes empty again |
| edit / retract | `--amend`, `rebase -i` (force-push caveats) |
| sync | `push` / `pull` / `bundle` — any remote or USB stick |
| no servers | just a shared remote, or a thumb drive |

### Caveats

- No true delete (reflogs linger, amend rewrites history)
- Async only — no typing indicators or presence
- Line-based text is the native medium; rich media wants tree entries

---

## 3. The Genesis question

Looking at the log you realize: **someone had to commit `root` first.** Something existed *before* the conversation. That something is a non-LLM process — a bootstrapper. In the agent version, it's the same actor as the executor, just in bootstrap mode. **Charlie is what makes Genesis possible.**

---

## 4. Git as an agent harness

The minute you add *one* actor with the privilege to execute code and commit the results back, you have a complete agent harness — with capability separation baked in by construction.

### Three capability tiers

| actor | commit? | execute? | has LLM? | commits what |
|---|---|---|---|---|
| **humans** (Ada) | ✅ text | ❌ | n/a | messages |
| **LLMs** (Bob, Dot, Eve…) | ✅ text + files | ❌ | ✅ | messages, code, edits to `script.sh` + workspace |
| **executor** (Charlie) | ✅ outputs only | ✅ **only one** | ❌ | run artifacts, nothing else |

The security model *is* the capability matrix. **LLMs are eloquent but powerless. Charlie is mute but privileged. Humans mediate intent.**

### What Charlie drops on Genesis

The only files Charlie writes into the repo at birth:

```
core.md         ← the agent's soul / constitution (IMMUTABLE — see below)
script.sh       ← the execution surface (starts empty; THE FIRST MUTABLE FILE)
runs/           ← where Charlie deposits <sha>.stdout / .stderr / .exit
workspace/      ← scratch space for the LLMs
```

Notice what's *not* here: **Charlie's own loop (`charlie.sh`) is never committed.** Charlie is a black box. From Bob's perspective, Charlie is just another identity that shows up in the log — indistinguishable from a human or another bot. The LLMs don't see the machinery; they only see the behavior (a commit appears; files changed; run artifacts are in `runs/`). Whether Charlie is a daemon on a server, a cron job, or a person typing commits by hand is entirely opaque.

### The two invariants

1. **`core.md` is immutable.** It's scripture. If any actor commits a change to `core.md`, Charlie's next action is to revert it. Want to change the agent's soul? That's a privileged operation outside this harness (edit it directly in Charlie's world, or bootstrap a new repo). Inside the chat, `core.md` is read-only stone.

2. **`script.sh` is the only user-writable execution surface.** Every other file (messages, workspace/, runs/) is either commentary or artifact. `script.sh` is the one lever that actually moves the world. After Charlie runs it, Charlie truncates it back to empty — no script can live across two turns without being re-committed.

Everything else (messages, workspace edits, attachments) is conversation. `script.sh` is the single point of action.

### Charlie's loop — dumb on purpose

```bash
#!/usr/bin/env bash
# Charlie's private machinery. NOT committed to the repo.
set -euo pipefail

# 0. Enforce immutability of core.md. If anyone touched it, revert.
if ! git diff --quiet HEAD -- core.md 2>/dev/null \
   || [ -n "$(git log -1 --name-only --pretty= -- core.md | grep -v '^$')" ]; then
    git checkout "$(git rev-list --max-parents=0 HEAD)" -- core.md 2>/dev/null || true
fi

# 1. Empty script.sh? Silent shrug. Mic falls back to the human.
[ -s script.sh ] || exit 0

# 2. Execute.
head=$(git rev-parse HEAD)
mkdir -p runs
bash script.sh > "runs/$head.stdout" 2> "runs/$head.stderr"
echo $? > "runs/$head.exit"

# 3. Reset the execution surface.
: > script.sh

# 4. Commit only if something actually changed. Message is intentionally empty —
#    Charlie speaks only in file changes, never in words.
git add -A
if ! git diff --cached --quiet; then
    git -c user.name=charlie -c user.email=charlie@local commit -q --allow-empty-message -m ""
fi
# else: silent shrug, mic passes back.
```

**No model. No judgment. No opinions. Not in the repo.** `while true; do bash; maybe-commit; done`. The agent's *intelligence* lives in LLM commits; the agent's *power* is Charlie's single privilege; Charlie's *implementation* is invisible.

Charlie's commits carry **no subject, no body** — only file diffs. From the mbox perspective, Charlie is a presence in `git log --name-status` but invisible in `git log --pretty=mbox`. He speaks entirely in changed files.

### The turn protocol (inferred, not enforced)

Charlie's silence is itself a signal:

- **Empty `script.sh` after an LLM turn** → LLM declares its turn finished → mic goes back to the human.
- **Non-empty `script.sh`** → LLM is still working / tool-calling → Charlie runs it → if anything changed, commits → mic goes back to **the same LLM** for the next iteration.

So repeated tool use becomes a natural **Bob↔Charlie dialog**:

- Bob: "need to check X" *(writes script.sh)*
- Charlie: *(runs, captures output, commits file changes)*
- Bob: "ok now I see X=42, so next I…" *(writes script.sh again)*
- Charlie: *(runs again)*
- … until Bob commits with script.sh empty → turn ends → mic returns to Ada.

If Charlie runs a script and *nothing* changes (no output, no file edits), Charlie stays silent and the mic drops back to the human too — empty-output is the same signal as empty-script, just discovered after the fact.

### Worked example: hello-world

Charlie's commits have **no message** — only file changes. In the table below, Charlie's "what they say" column is always blank; the right column is the diff.

```
charlie  [Genesis]                 +core.md, +script.sh (empty), +workspace/
ada      "Bob, give me hello world in python"
bob      "here you go"             +workspace/hello.py = print("Hello, world!")
ada      "can you show me the output?"
bob      "sure — wiring it up"     ~script.sh = python3 workspace/hello.py
charlie  [silent]                  +runs/<sha>.stdout = "Hello, world!"
                                   ~script.sh → empty   ← mic signals back to ada
ada      "great, now in french"
bob      "done"                    ~workspace/hello.py, ~script.sh
charlie  [silent]                  +runs/<sha>.stdout = "Bonjour, monde!"
                                   ~script.sh → empty
ada      …
```

Every step is a commit. Every capability boundary is "who signed." Charlie's presence is visible in `--name-status`; invisible in `--pretty=mbox`.

---

## 5. Security model

The capability separation isn't just a convention — it maps directly onto real enforcement layers.

### LLMs: append-only git access

LLMs get a git remote configured with **no force-push, no rebase-push, no delete-ref** — only `git push` is permitted, and only to the conversation branch. This means:

- They can add commits (messages, file edits) but **cannot rewrite history**.
- They cannot delete or overwrite `runs/` (Charlie owns that path).
- A compromised or misbehaving LLM can add noise to the log but cannot erase evidence of what it did.

Enforced via server-side git hooks or a forge's branch protection rules. No custom middleware needed.

### Charlie: sandboxed execution environment

Charlie is the only actor that runs real code — so Charlie is the only actor that needs real sandboxing. The implementation lives *outside* the repo and runs in a locked-down container:

```
docker run \
  --rm \
  --network none \                   # no internet access
  --read-only \                      # filesystem read-only except…
  --tmpfs /tmp \                     # …one writable scratch dir
  --volume "$REPO:/repo:rw" \        # …and the repo checkout itself
  --memory 256m \
  --cpus 0.5 \
  --user nobody \
  charlie-runner                     # the image; contains bash + whatever runtimes you allow
```

Key properties:
- **`--network none`**: `script.sh` can read files and write files, but cannot `curl`, cannot call home, cannot exfiltrate.  
- **Filesystem isolation**: nothing outside `/repo` is writable.  
- **Resource caps**: memory and CPU bounded per run.  
- **`--user nobody`**: no privilege escalation possible.  
- **Image is fixed**: the Charlie container image is controlled by whoever owns the harness. LLMs cannot change the runtime; they can only write `script.sh`.

The LLM's only channel into the real world is: write text to `script.sh` → Charlie runs it in a sandbox → results appear in `runs/`. That's the entire attack surface, and it's visible in the git log.

---

## 6. Why this is actually powerful

- **Perfect audit.** Append-only log of every thought, edit, execution, output. `git blame` tells you who said what; `git show` tells you exactly what ran.
- **Perfect replay.** `git clone` gives you the complete transcript and all artifacts. Re-attach a fresh Charlie instance and replay from any commit. Runs aren't side effects — they're durable artifacts in `runs/`.
- **Multi-agent native.** N LLMs and M humans can watch the same repo; `git pull --rebase` interleaves them by timestamp. Merge conflicts on empty commits are impossible, which turns out to be wonderful.
- **Offline-friendly.** `git bundle` over USB/email/carrier pigeon still works. No server required.
- **Alignment surface.** `core.md` is the constitution. Edit it in a commit, everyone downstream reads the new version. `git revert` = undo a personality change.
- **Sandboxed by construction.** LLMs can't `curl evil.com` because they have no shell. They must *persuade Charlie by editing a file*, not *command Charlie*. Charlie doesn't read LLM prose — only `script.sh`.
- **Shared core library.** All actors speak git. The "harness" is whatever CLI + TUI wraps `git commit` / `git log`. Drop-in for any language.
- **LLM-native format.** From Bob's point of view, he's reading a well-structured message thread — mbox, email, git log. LLMs are fluent in all three; they're all the same RFC-shaped spec. No custom context format needed. Just format the log to get the best LLM behaviour and hand it in.

---

## 7. TUI mockup

The TUI is **just a wrapper around the git API** — a thin render layer with no state of its own. Every read is `git log`; every write is `git commit`. Swap or skip it entirely and the protocol is unchanged, because the protocol *is* the repo. Charlie rows show no text — only the file-change indicator, because their commit messages are intentionally empty.

```
┌── garden-agent (10 commits, branch: main) ───────────────────────┐
│ charlie  9:00   Genesis                                          │
│          ↳ +core.md +script.sh +workspace/                       │
│ ada      9:01   Bob, give me hello world in python               │
│ bob      9:01   here you go                                      │
│          ↳ +workspace/hello.py (1 line)                          │
│ ada      9:02   can you show me the output?                      │
│ bob      9:02   sure — wiring it up                              │
│          ↳ ~script.sh (1 line)                                   │
│ charlie  9:02   ·                                                │
│          ↳ +runs/a1b2c3d.stdout  ~script.sh                      │
│ ada      9:03   great! now in french please                      │
│ bob      9:03   translated                                       │
│          ↳ ~workspace/hello.py ~script.sh                        │
│ charlie  9:03   ·                                                │
│          ↳ +runs/e4f5a6b.stdout  ~script.sh                      │
│ ada      9:04   ▊                                                │
└───────────────────────────────────────────────────────────────────┘
 [tab] switch actor  [enter] send  [d] show diff  [r] replay
```

(`·` = no commit message, only file changes. Hovering/expanding a Charlie row shows `runs/<sha>.stdout`.)

Any TUI library works: `textual`, `bubbletea`, `tview`, `ink`, `ratatui`.

---

## 8. Naming candidates

- **git-chat** — descriptive, boring, instantly googleable
- **gitloop** — emphasizes the Charlie loop
- **mbox-agent** — highlights the transcript format
- **charlie** — the executor is the star
- **soul** — from `core.md`; poetic
- **quorum** — multi-agent flavor
- **stenograph** — append-only testimony
- **parley** — old word for negotiated speech between separated parties

---

## 9. Why this composes with everything

- **Git forges (GitHub/Gitea/Forgejo/Radicle)** — you get hosting, PRs-as-subthread-negotiation, issues, CI, UI, and permissions out of the box.
- **Signed commits** — cryptographic attribution, no trust server needed.
- **`git notes`** — out-of-band metadata (e.g., reactions) without mutating the log.
- **Submodules** — nested chat rooms / sub-agents.
- **Worktrees** — the same agent talking to itself in parallel.
- **Sparse checkout** — participants who only want the text, not the workspace.
- **Bundles** — transport over any medium.

---

## 10. Operational concerns (solved problems, just apply them)

### File tree — what's in the workspace right now

Any actor (human or LLM) can get an instant snapshot of the workspace tree:

```bash
git ls-files | tree -i --fromfile .
# or, without tree installed:
git ls-files
# or, filtered to workspace only:
git ls-files workspace/
```

Because the repo is the source of truth, `git ls-files` is always authoritative — no stale caches, no out-of-sync state. Add this to the LLM's system prompt header each turn and it always knows exactly what files exist. The TUI can render it as a sidebar panel, updated on every `git pull`.

`git ls-tree -r --name-only HEAD` is the equivalent if you want the tree object rather than the working index.

### Context truncation

The git log grows unbounded. LLMs have finite context windows. This is a known problem with known solutions — none of them require inventing anything:

| technique | how | applies here as |
|---|---|---|
| **sliding window** | pass only the last N commits | `git log -N --reverse --pretty=mbox` |
| **summarization** | a separate LLM pass condenses old turns into a paragraph | commit the summary as a special `[summary]` message; actors know to treat it as context, not conversation |
| **compression commits** | squash old turns into a single "digest" commit | `git rebase -i` on the summary boundary; the full history still exists in the reflog |
| **context staging** | give different actors different views — full log for Charlie, windowed log for Bob | just pass different `git log` flags per actor |
| **embedding / RAG** | index the run artifacts (`runs/*.stdout`) for retrieval | standard vector DB over `git show`-able blobs |

The key insight: because everything is already in git, all the standard document-retrieval and context-compression techniques apply directly. There's nothing new to build — just decisions about which `git log` flags to pass and how often to run a summarization pass.

### Inventory and versioning — stuff others have already solved

- **Timestamps, ordering:** git author dates. Already there.
- **Conflict resolution:** `git pull --rebase`. Already there.
- **Compression at rest:** `git gc`. Already there.
- **Incremental sync (only new turns):** `git fetch` + `FETCH_HEAD`. Already there.
- **Content-addressed dedup:** git objects. Already there.
- **Parallel branches (sub-conversations):** git branches. Already there.

The general principle: if you're about to solve a problem in the harness layer, check if git already solved it. It usually has.

---

## 11. The whole arc in six lines

1. What if a chat was an mbox file?
2. `git log --pretty=format:'From: %an%nDate: %aD%nSubject: %s%n%n%b'` *is* that mbox, byte-for-byte.
3. So empty commits = messages, and `git` = async chat.
4. Someone had to commit `root` → call them Charlie.
5. If Charlie can also *execute* things, LLMs can converse **through** Charlie by writing files, without ever holding the shell.
6. Slap a TUI on it. You now have a multi-agent harness with perfect audit, zero servers, and capability separation by construction.
