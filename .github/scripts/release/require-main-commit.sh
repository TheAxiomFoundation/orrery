#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_SHA:?EXPECTED_SHA is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"

git fetch origin main
actual_sha=$(git rev-parse HEAD)
if [ "$actual_sha" != "$EXPECTED_SHA" ]; then
  echo "Checked out commit $actual_sha does not equal generated release commit $EXPECTED_SHA." >&2
  exit 1
fi
git merge-base --is-ancestor "$EXPECTED_SHA" origin/main
bun scripts/release.ts validate-changelog --tag "$RELEASE_TAG" > /dev/null
