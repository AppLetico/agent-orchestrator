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

**To load env (OPENAI_API_KEY, LINEAR_API_KEY, GITHUB_TOKEN) and start:** use the Makefile so you don't have to type `set -a && source .env.local && set +a` every time:

```bash
cd ~/workspace/agent-orchestrator
make start-clasper    # start for clasper-core; or: make start (for ao project)
```

Or run any other `ao` command with env loaded:

```bash
make run CMD="ao status"
make spawn PROJECT=clasper-core ISSUE=CLA-5
```

The dashboard runs at `http://localhost:3000`. You can use it to view status; interaction can be done entirely from the CLI (see below).

---

## 2. Spawn an agent session

Create a new agent (worktree + tmux session + Codex/agent process):

```bash
cd ~/workspace/agent-orchestrator
ao spawn clasper-core           # ad-hoc, no issue
ao spawn clasper-core 123       # with GitHub issue #123 (when tracker is github)
ao spawn clasper-core INT-456   # with Linear ticket INT-456 (when tracker is linear)
```

Use the **issue identifier your tracker expects**: GitHub issue number (e.g. `123` or `#123`) when the project uses the GitHub tracker, or **Linear ticket ID** (e.g. `INT-456`) when the project uses the Linear tracker. The project’s tracker is set in `agent-orchestrator.yaml` (see **Linear** below).

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
| Start server (with env)    | `make start-clasper` or `make start` |
| Spawn agent (with env)     | `make spawn PROJECT=clasper-core ISSUE=CLA-5` |
| Any ao command with env   | `make run CMD="ao status"` (or `ao session ls`, etc.) |
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

### Linear tracker

If you added a Linear API key and use the Linear tracker for a project:

1. **Config:** In `agent-orchestrator.yaml`, set the project’s tracker and ensure the server has the key at startup:
   ```yaml
   projects:
     clasper-core:
       # ...
       tracker:
         plugin: linear
         teamId: "your-linear-team-uuid"
   ```
   Put `LINEAR_API_KEY` in `.env.local` and start with `make start-clasper` (or `make run CMD="ao start clasper-core"`) so the server has the key.

2. **Spawn by Linear ticket:** Use the Linear issue identifier (e.g. `INT-456`), not a GitHub issue number:
   ```bash
   ao spawn clasper-core INT-456
   ```

3. **Everything else is the same:** `ao send`, `ao status`, `ao session ls`, and attaching via tmux work as before. The agent gets the Linear ticket title and description as context, branches are named `feat/INT-456`, and the dashboard shows the Linear issue link.
