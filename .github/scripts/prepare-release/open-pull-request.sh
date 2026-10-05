#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_INCREMENT:?RELEASE_INCREMENT is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"

branch="release/$RELEASE_TAG"
gh pr create \
  --base main \
  --head "$branch" \
  --title "Prepare Orrery $RELEASE_VERSION" \
  --body "Towncrier compiled the pending changelog fragments and applied the inferred $RELEASE_INCREMENT version increment. After this pull request merges and CI succeeds, run the Release workflow in publish mode. That workflow will create $RELEASE_TAG at the reviewed main commit before publishing the npm package and GitHub release."
gh workflow run ci.yml --ref "$branch"
