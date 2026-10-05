#!/usr/bin/env bash
set -euo pipefail

: "${BASE_REF:?BASE_REF is required}"
: "${HEAD_REF:?HEAD_REF is required}"

base="origin/$BASE_REF"
if git cat-file -e "$base:CHANGELOG.md" 2> /dev/null && \
   [[ "$HEAD_REF" != release/v* ]] && \
   git diff --name-only "$base"...HEAD | grep --fixed-strings --line-regexp --quiet CHANGELOG.md; then
  echo "Ordinary pull requests must add changelog.d fragments instead of editing CHANGELOG.md." >&2
  exit 1
fi

uvx --from towncrier==26.9.0 towncrier check --compare-with "$base"
