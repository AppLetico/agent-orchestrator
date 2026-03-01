# AO for Clasper Core — Self-Improving Workflow

This doc describes how to run Agent Orchestrator (AO) on **clasper-core** in the same style as the “self-improving” setup: agents work in parallel on Linear tickets, CI failures and review comments are sent back to agents automatically, and you only step in to merge and make decisions.

## Prerequisites

- **agent-orchestrator** repo built: `pnpm install && pnpm build`
- **agent-orchestrator.yaml** in the agent-orchestrator repo with the `clasper-core` project (and optional project-level reactions)
- Env: put `OPENAI_API_KEY`, `LINEAR_API_KEY`, `GITHUB_TOKEN` in `.env.local`. You don't need to source it manually — use the Makefile (see below).
- **clasper-core** has CI that runs on PRs (Build, Lint, Test, Typecheck) so the orchestrator can detect failures

## The loop

1. **Start the orchestrator** so it can poll sessions and run reactions:
   ```bash
   cd ~/workspace/agent-orchestrator
   make start-clasper
   ```
   Dashboard: http://localhost:3000

2. **Spawn agents from your Linear backlog** (one session per issue):
   ```bash
   make spawn PROJECT=clasper-core ISSUE=CLA-5
   make spawn PROJECT=clasper-core ISSUE=CLA-6
   # ... or: ao spawn clasper-core CLA-5 (env already in server)
   ```
   Each session gets a worktree, branch `feat/CLA-*`, and the issue title/description as context.

3. **Send the initial task** (implement, build, open PR):
   ```bash
   ao send --no-wait clasper-1 "Implement the issue. Run npm test and npm run typecheck locally, then push and create a PR with gh pr create."
   ```
   Use the session id from `ao spawn` or `ao session ls`.

4. **Reactions run automatically** (no human in the loop):
   - **CI failed** → orchestrator sends a message to that session: “CI is failing… fix (npm test, typecheck, build, lint), push.”
   - **Changes requested** → “There are review comments… address each one, push, reply.”
   - **Bugbot / automated review comments** → “Fix the flagged issues and push.”
   The agent (Codex) receives these in its session and can fix and push without you doing anything.

5. **You only step in when**:
   - A PR is **approved and green** → you get a notification (“ready to merge”); you merge in GitHub and move the Linear ticket to Done.
   - The agent is stuck, needs input, or has exceeded retries → you get notified; you can attach to the session or kill it.

## Parallel sessions

Spawn several sessions (different Linear issues), send each a task, and let them run. Use `ao status` and the dashboard to see which are working, which have open PRs, and which need attention. The orchestrator tracks CI and review state per session and triggers the right reaction for each.

## Optional: auto-merge

If you want approved, green PRs to be merged automatically (no human click), add under the `clasper-core` project in `agent-orchestrator.yaml`:

```yaml
reactions:
  approved-and-green:
    auto: true
    action: auto-merge
```

(Requires the auto-merge integration to be configured; otherwise keep `action: notify` so you merge manually.)

## Summary

| What | How |
|------|-----|
| Start server | `make start-clasper` (or `make start` for ao project) |
| Spawn by Linear ticket | `make spawn PROJECT=clasper-core ISSUE=CLA-5` or `ao spawn clasper-core CLA-5` |
| Send task | `ao send --no-wait clasper-1 "Implement… build… gh pr create"` |
| Any ao command with env | `make run CMD="ao status"` |
| CI fails / review comments | Handled by reactions → message sent to agent session |
| PR ready | Notify (or auto-merge if configured) |
| See status | `ao status` or dashboard http://localhost:3000 |

See **INTERACTING-WITH-AO.md** for more CLI usage (attach to tmux, kill session, send from file, etc.).

---

## How you get notified

Your config uses the **desktop** notifier (`defaults.notifiers: [desktop]`). When a reaction has `action: notify` (e.g. **approved-and-green**), the orchestrator sends an **OS desktop notification**:

- **macOS**: Uses `osascript` → Notification Center. Allow notifications for the app you run `ao start` from: **System Settings → Notifications** → **Terminal**, **iTerm**, or **Cursor** → turn **Allow Notifications** on. Urgent events (agent stuck, needs input) play the default sound.
- **Linux**: Uses `notify-send` (install `libnotify-bin` if needed). Urgent uses `--urgency=critical`.

You get a popup when: a PR is **approved and green**; an agent is **stuck** / **needs input** / **exited**; or a reaction **escalates** after retries. To add **Slack** or **webhooks**, add the notifier in config and to `defaults.notifiers` or `notificationRouting`.
