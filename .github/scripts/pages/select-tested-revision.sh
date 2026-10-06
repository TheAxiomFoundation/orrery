#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${TESTED_SHA:?TESTED_SHA is required}"

current_sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')
if [ "$current_sha" = "$TESTED_SHA" ]; then
  echo "publish=true" >> "$GITHUB_OUTPUT"
else
  echo "publish=false" >> "$GITHUB_OUTPUT"
  echo "::notice::Skipping superseded revision $TESTED_SHA; main is $current_sha"
fi
