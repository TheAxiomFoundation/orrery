#!/usr/bin/env bash
set -euo pipefail

if grep -RInE '^[[:space:]]+run:[[:space:]]*[|>]' .github/workflows; then
  echo "Workflow files must invoke Bash files instead of embedding multi-line run scripts." >&2
  exit 1
fi

find .github/scripts -type f -name '*.sh' -exec bash -n '{}' +
