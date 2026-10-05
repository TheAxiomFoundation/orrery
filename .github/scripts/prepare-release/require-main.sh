#!/usr/bin/env bash
set -euo pipefail

if [ "${GITHUB_REF:-}" != "refs/heads/main" ]; then
  echo "Run this workflow from main." >&2
  exit 1
fi
