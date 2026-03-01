---
name: Planner agent + project memory
overview: Add a long-lived “planner” session type that maintains shared project memory in-repo and can create tracker tickets (Linear/GitHub) directly, while the orchestrator remains execution-focused.
todos:
  - id: core-planner-session
    content: Add planner role + spawnPlanner in core types/session-manager; persist metadata similarly to orchestrator
    status: pending
  - id: planner-model-config
    content: Add agentConfig.plannerModel and ensure spawn/restore uses plannerModel ?? model (mirrors orchestratorModel)
    status: pending
  - id: repo-memory
    content: Add projectMemoryFile config + prompt-builder integration (planner prompt includes memory path/contents)
    status: pending
  - id: cli-planner
    content: Add CLI helpers (ao planner start/attach[/status]) mirroring orchestrator interactions
    status: pending
  - id: plan-artifacts
    content: Add planner plan artifacts in-repo (draft plan + proposed tickets spec) and conventions for updating them
    status: pending
  - id: approval-gated-ticketing
    content: Add approval-gated ticket creation flow (review in dashboard, select tickets, then create via Tracker.createIssue)
    status: pending
  - id: cli-create-issue
    content: Add ao CLI command to create issues via Tracker.createIssue (used by server-side routes; optional for power users)
    status: pending
  - id: agent-env
    content: (Optional) Forward tracker credentials into agent env only if we explicitly want the planner to create issues directly; default is server-side creation after approval
    status: pending
  - id: web-planner
    content: Add dashboard Planner button + planner view + /api/planner/start route; detect planner session in page.tsx
    status: pending
  - id: tests
    content: Update/add tests for planner spawn/restore model selection, plan artifact parsing, approval-gated ticket creation, CLI planner commands, and web routes
    status: pending
isProject: false
---

### Goal

Introduce a dedicated **planner** agent that:

- Runs as a long-lived AO session (like the orchestrator)
- Keeps a **shared, versioned project memory/vision** in the target repo
- Creates tickets in the configured tracker (Linear) as part of roadmap planning

### Key design decisions (based on your answers)

- **Memory is shared**: stored in the repo (git-tracked)
- **Surface mirrors orchestrator**: dashboard entry + session terminal (tmux) + CLI helpers
- **Planner is a session**: its own terminal/session (e.g. `<prefix>-planner`)
- **Planner model is configurable**: `plannerModel ?? model` (same pattern as `orchestratorModel ?? model`)
- **Plan-mode workflow**: planner iterates on a draft plan + proposed tickets; **no tracker writes until you approve**
- **Approval granularity**: per-ticket selection (checkboxes) with an “approve all” option
- **Ticket creation location**: server-side (web/CLI) via `Tracker.createIssue` after approval (planner session does not need tracker creds by default)

### Implementation outline

#### 1) Add a planner session type (core)

- Extend core types and session manager to support a dedicated planner session:
  - Add `spawnPlanner(config)` to `SessionManager` in `[packages/core/src/types.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/core/src/types.ts)`
  - Implement it in `[packages/core/src/session-manager.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/core/src/session-manager.ts)` by mirroring `spawnOrchestrator`, but using a stable session id suffix like `-planner` and a planning-focused prompt.
- Add an explicit role flag for agent launches to avoid relying on naming conventions:
  - Add optional `role?: "worker" | "orchestrator" | "planner"` to `AgentLaunchConfig` (same file) and set it from `spawn`, `spawnOrchestrator`, `spawnPlanner`, and `restore`.
- Add planner model configuration (mirrors orchestrator model):
  - Add optional `plannerModel?: string` alongside `model` and `orchestratorModel` in `agentConfig`.
  - Ensure launch config uses:
    - Planner: `plannerModel ?? model`
    - Orchestrator: `orchestratorModel ?? model`
    - Worker: `model`
  - Ensure `restore()` selects the correct model based on role/session type.

#### 2) Shared in-repo project memory

- Add a `projectMemoryFile` (or `plannerMemoryFile`) optional config field on `ProjectConfig` in `[packages/core/src/types.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/core/src/types.ts)` and config parsing/validation in `[packages/core/src/config.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/core/src/config.ts)`.
- Default behavior: if unset, use `docs/PROJECT_MEMORY.md`.
- Update prompt composition in `[packages/core/src/prompt-builder.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/core/src/prompt-builder.ts)` so the planner’s system prompt:
  - Points to the memory file path
  - (Optionally) inlines its contents (with a conservative truncation limit) so the planner “keeps the vision in mind” even before it opens files

#### 3) Ticket creation command (CLI) for the planner to use

- Add a CLI command that wraps the existing tracker plugin interface (`Tracker.createIssue`) so the planner can create issues with a stable, easy command:
  - Example: `ao issues create --project <id> --title ... --description ... --labels ... --priority ...`
- Implement under `[packages/cli/src/commands/](/Users/jasongelinas/workspace/agent-orchestrator/packages/cli/src/commands)` using `getServices()`/registry + `tracker.createIssue`.
- This leverages the existing Linear tracker implementation in `[packages/plugins/tracker-linear/src/index.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/plugins/tracker-linear/src/index.ts)`.

#### 4) Planner “Plan mode” artifacts (draft plan + proposed tickets)

- Define two in-repo artifacts the planner maintains:
  - **Draft plan** (human-readable): e.g. `docs/PLANS/planner-draft.md`
  - **Proposed tickets spec** (machine-readable): e.g. `docs/PLANS/planner-tickets.json`
- The planner session updates these files during back-and-forth refinement.
- The dashboard planner view renders both, and uses the JSON spec to drive ticket approval UI.

Suggested `planner-tickets.json` shape:

- `planId` (string, stable identifier)
- `updatedAt` (ISO string)
- `memoryFile` (path used for context)
- `tickets[]`: `{ title, description, labels?, priority?, assignee?, projectId, dependsOn? }`

#### 5) Approval-gated ticket creation (no Linear writes until approved)

- Add dashboard planner view that shows:
  - Draft plan text
  - Proposed tickets list with checkboxes (default: all selected)
  - Buttons: **Approve selected → Create tickets**, **Refresh** (re-read artifacts), and link to planner terminal
- Add web routes:
  - `POST /api/planner/start` → starts the planner session if missing
  - `GET /api/planner/draft` → returns the latest `planner-draft.md` + `planner-tickets.json`
  - `POST /api/planner/approve` → body includes `planId` + selected ticket indexes/IDs; server creates tickets via `Tracker.createIssue` and returns created Issue URLs/IDs
- After creation, write back a “Created tickets” section into `planner-draft.md` (or a `planner-created.json`) to keep the plan traceable.

#### 6) Forward tracker credentials to planner sessions (agent env) — optional

- Update the Codex agent plugin env forwarding in `[packages/plugins/agent-codex/src/index.ts](/Users/jasongelinas/workspace/agent-orchestrator/packages/plugins/agent-codex/src/index.ts)`:
  - If `config.role === "planner"` and the project uses Linear (or if `LINEAR_API_KEY`/`COMPOSIO_API_KEY` are present), forward:
    - `LINEAR_API_KEY`
    - `COMPOSIO_API_KEY`, `COMPOSIO_ENTITY_ID` (if you’re using Composio transport)
- (Optional) mirror for other agent plugins so planner works regardless of agent choice.

#### 7) Dashboard integration

- Add planner discovery and UI affordance similar to orchestrator:
  - In `[packages/web/src/app/page.tsx](/Users/jasongelinas/workspace/agent-orchestrator/packages/web/src/app/page.tsx)`, detect `*-planner` sessions and pass `plannerId` to the dashboard.
  - In `[packages/web/src/components/Dashboard.tsx](/Users/jasongelinas/workspace/agent-orchestrator/packages/web/src/components/Dashboard.tsx)`, add a **Planner** button next to Orchestrator that links to `/sessions/<plannerId>`.
- Add planner view route (e.g. `/planner`) that renders the plan-mode UI described above and uses the `/api/planner/`* routes.

#### 5b) CLI integration (mirror orchestrator interactions)

- Add CLI helpers to manage planner sessions similarly to orchestrator/workers:
  - `ao planner start --project <id>`: calls the same underlying service as the web route (create planner if missing, otherwise no-op).
  - `ao planner attach --project <id>` (or `--session <id>`): prints tmux attach instructions or opens the session terminal URL (depending on runtime/terminal plugin support).
  - (Optional) `ao planner status --project <id>`: shows whether the planner session exists, and its current status/activity.

#### 6) Tests

- Add/adjust unit tests for:
  - `spawnPlanner` (metadata fields, role propagation)
  - prompt-builder inclusion of memory file
  - new CLI command (mock tracker)
  - web route `/api/planner/start`

### Resulting workflow

- You maintain `docs/PROJECT_MEMORY.md` (vision/roadmap/decisions).
- You open the dashboard and click **Planner** (or Start Planner) to open the planner terminal and the planner view.
- You iterate on the roadmap with the planner (back-and-forth), and the planner updates:
  - `docs/PROJECT_MEMORY.md` (vision/constraints/decisions)
  - `docs/PLANS/planner-draft.md` (draft plan)
  - `docs/PLANS/planner-tickets.json` (proposed tickets)
- When you’re happy, you click **Approve selected → Create tickets** in the dashboard to create issues in Linear.
- Orchestrator/worker sessions continue focusing on execution of those tickets.

### Suggested memory file skeleton

- Vision
- Non-goals
- Product principles
- Current roadmap (next 2–6 weeks)
- Technical constraints and invariants
- Decision log
- Open questions

