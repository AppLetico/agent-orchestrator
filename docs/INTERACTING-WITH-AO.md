# Interacting with Agent Orchestrator (AO)

This guide covers how to run AO, spawn agents, send them work (including markdown specs), and monitor from the terminal. Use it when you want to give the agent tasks without using the web UI.

---

## Where to run commands

All `ao` commands look for `agent-orchestrator.yaml` in the **current directory**. Run them from the agent-orchestrator repo (or a directory that contains the config):

```bash
cd ~/workspace/agent-orchestrator
# then run any ao command
```

If you're in another directory, `ao` will error with "No agent-orchestrator.yaml found."

---

## 1. Start the server

Start the orchestrator and dashboard for a project. With multiple projects you must specify which one:

```bash
cd ~/workspace/agent-orchestrator
ao start clasper-core    # or: ao start ao
```

**To give Codex your OpenAI API key (no login prompt in the terminal):** load `.env.local` before starting so the server has `OPENAI_API_KEY`:

```bash
cd ~/workspace/agent-orchestrator
set -a && source .env.local && set +a && ao start clasper-core
```

The dashboard runs at `http://localhost:3000`. You can use it to view status; interaction can be done entirely from the CLI (see below).

---

## 2. Spawn an agent session

Create a new agent (worktree + tmux session + Codex/agent process):

```bash
cd ~/workspace/agent-orchestrator
ao spawn clasper-core           # ad-hoc, no issue
ao spawn clasper-core 123       # with GitHub issue #123
```

Output includes the **session id** (e.g. `clasper-1`) and how to attach:

```
✔ Session clasper-1 created
  Worktree: /Users/you/.worktrees/clasper-core/clasper-1
  Attach:   tmux attach -t 304754386bc3-clasper-1
```

---

## 3. Send work to the agent (no human in the loop)

Use **`ao send --no-wait`** so the message is delivered and submitted immediately. Without `--no-wait`, the CLI waits for the session to be "idle," which can hang with Codex.

### Short task (inline message)

```bash
cd ~/workspace/agent-orchestrator
ao send --no-wait clasper-1 "Run npm test and report pass or fail and how many tests."
```

Replace `clasper-1` with your session id from `ao session ls`.

### Markdown spec or long document (from file)

Put your spec in a file, then send its contents:

```bash
cd ~/workspace/agent-orchestrator
ao send --no-wait clasper-1 --file path/to/spec.md
```

Examples:

```bash
ao send --no-wait clasper-1 --file specs/feature-x.md
ao send --no-wait clasper-1 --file ~/docs/my-feature-spec.md
```

The entire file is sent into the agent's session and submitted (Enter is sent automatically). The agent sees the full markdown and can work from it.

---

## 4. See what’s running

```bash
cd ~/workspace/agent-orchestrator
ao status              # overview: sessions, branches, PR, CI, activity
ao session ls          # list session ids and age
```

---

## 5. Watch the agent in your terminal

Attach to the agent’s tmux session to see the same terminal the agent uses (Codex input/output):

```bash
tmux attach -t 304754386bc3-clasper-1
```

Use the session name from `ao spawn` output or from `tmux list-sessions`. Detach without killing the session: **Ctrl+b**, then **d**.

---

## 6. Session management

| Goal              | Command |
|-------------------|--------|
| Kill a session    | `ao session kill clasper-1` |
| Restore crashed   | `ao session restore clasper-1` |
| List sessions     | `ao session ls` |

---

## Quick reference

| What you want              | Command |
|----------------------------|--------|
| Start server (with env)    | `cd ~/workspace/agent-orchestrator && set -a && source .env.local && set +a && ao start clasper-core` |
| Spawn agent                | `ao spawn clasper-core` or `ao spawn clasper-core <issue#>` |
| Send short task            | `ao send --no-wait clasper-1 "Your task here"` |
| Send markdown spec         | `ao send --no-wait clasper-1 --file path/to/spec.md` |
| See status                 | `ao status` |
| List sessions              | `ao session ls` |
| Watch agent live           | `tmux attach -t <session-name>` (from `tmux list-sessions`) |
| Kill session               | `ao session kill clasper-1` |

---

## Notes

- **Always run `ao` from the directory that contains `agent-orchestrator.yaml`** (typically the agent-orchestrator repo).
- **Use `--no-wait`** with `ao send` so the message is delivered and submitted without waiting for "idle"; otherwise the send can block.
- **Codex API key:** To avoid the Codex login prompt, start the server with `OPENAI_API_KEY` in the environment (e.g. `source .env.local` before `ao start`). The codex plugin forwards it into the session.
