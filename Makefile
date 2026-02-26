# Agent Orchestrator — convenience targets
# Run from the agent-orchestrator repo root (where agent-orchestrator.yaml lives).
#
# You don't need to run "set -a && source .env.local && set +a" yourself:
# use "make start", "make start-clasper", "make spawn", or "make run CMD=..." .

# Default project to start (override: make start PROJECT=clasper-core)
PROJECT ?= ao

# Start the AO server and dashboard with env loaded from .env.local.
# Uses LINEAR_API_KEY, OPENAI_API_KEY, etc. from .env.local.
start:
	set -a && . .env.local && set +a && ao start $(PROJECT)

# Rebuild all packages (required after changing core or plugin code).
rebuild:
	pnpm build

# Rebuild and start the server. Stop any running "ao start" first (Ctrl+C), then:
#   make restart
#   make restart PROJECT=clasper-core
#   make restart-clasper
restart: rebuild
	set -a && . .env.local && set +a && ao start $(PROJECT)

# Start AO for clasper-core (agents will work in the clasper-core repo).
start-clasper:
	set -a && . .env.local && set +a && ao start clasper-core

# Rebuild and start AO for clasper-core.
restart-clasper: rebuild
	set -a && . .env.local && set +a && ao start clasper-core

# Spawn an agent session with env loaded (needed for Linear tracker).
# Usage: make spawn PROJECT=ao ISSUE=CLA-5   or   make spawn PROJECT=clasper-core ISSUE=42
spawn:
	set -a && . .env.local && set +a && ao spawn $(PROJECT) $(ISSUE)

# Run any ao command with .env.local loaded. Examples:
#   make run CMD="ao status"
#   make run CMD="ao session ls"
#   make run CMD="ao send --no-wait clasper-1 'fix the lint'"
run:
	set -a && . .env.local && set +a && $(CMD)

.PHONY: start start-clasper spawn run rebuild restart restart-clasper
