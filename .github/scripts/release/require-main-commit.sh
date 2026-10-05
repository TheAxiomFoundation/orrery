#!/usr/bin/env bash
set -euo pipefail

: "${EVENT_NAME:?EVENT_NAME is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

git fetch origin main
git merge-base --is-ancestor "$GITHUB_SHA" origin/main
if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ "$(git rev-parse origin/main)" != "$GITHUB_SHA" ]; then
  echo "Manual publication must use the current main commit." >&2
  exit 1
fi
