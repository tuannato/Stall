#!/usr/bin/env bash
# Run the standing Stall critic over a proposal.
#   scripts/grok-critic.sh <proposal-file> [output-file]
# The critic is defined once in .claude/agents/stall-critic.md and is shared
# with Claude Code, so both agents argue from the same brief.
set -euo pipefail

proposal="${1:?usage: grok-critic.sh <proposal-file> [output-file]}"
out="${2:-/dev/stdout}"

exec grok --agent stall-critic \
    --cwd "$(git rev-parse --show-toplevel)" \
    --prompt-file "$proposal" \
    --output-format plain > "$out"
