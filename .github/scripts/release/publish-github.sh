#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${PRERELEASE:?PRERELEASE is required}"
: "${RELEASE_ASSET:?RELEASE_ASSET is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"

bun scripts/release.ts notes --tag "$RELEASE_TAG" > release/RELEASE_NOTES.md
gh api --paginate --slurp \
  "repos/$GITHUB_REPOSITORY/releases?per_page=100" > all-release-pages.json
listed_id=$(jq --raw-output --arg tag "$RELEASE_TAG" \
  '[.[][] | select(.tag_name == $tag) | .id] | if length == 0 then "" elif length == 1 then .[0] else error("duplicate release tags") end' \
  all-release-pages.json)

set +e
gh api "repos/$GITHUB_REPOSITORY/releases/tags/$RELEASE_TAG" > exact-release.json 2> exact-release.error
direct_status=$?
set -e

if [ "$direct_status" -eq 0 ]; then
  direct_id=$(jq --raw-output .id exact-release.json)
  if [ "$listed_id" != "$direct_id" ]; then
    echo "GitHub release list and exact-tag lookup disagree" >&2
    exit 1
  fi
  actual_prerelease=$(jq --raw-output .prerelease exact-release.json)
  if [ "$actual_prerelease" != "$PRERELEASE" ]; then
    echo "existing GitHub release has the wrong prerelease status" >&2
    exit 1
  fi
  actual_notes=$(jq --raw-output .body exact-release.json)
  expected_notes=$(cat release/RELEASE_NOTES.md)
  if [ "$actual_notes" != "$expected_notes" ]; then
    echo "existing GitHub release notes differ from CHANGELOG.md" >&2
    exit 1
  fi
  archive_sha=$(sha256sum "release/$RELEASE_ASSET" | cut -d' ' -f1)
  sums_sha=$(sha256sum release/SHA256SUMS | cut -d' ' -f1)
  jq --exit-status \
    --arg archive "$RELEASE_ASSET" \
    --arg archive_digest "sha256:$archive_sha" \
    --arg sums_digest "sha256:$sums_sha" \
    '(.assets | map(select(.name == $archive and .digest == $archive_digest)) | length == 1) and
     (.assets | map(select(.name == "SHA256SUMS" and .digest == $sums_digest)) | length == 1)' \
    exact-release.json > /dev/null
  exit 0
fi

if [ -n "$listed_id" ]; then
  echo "GitHub release list and exact-tag lookup disagree" >&2
  exit 1
fi
if ! grep --quiet 'HTTP 404' exact-release.error; then
  cat exact-release.error
  exit 1
fi

args=(
  "$RELEASE_TAG"
  "release/$RELEASE_ASSET"
  "release/SHA256SUMS"
  --title "Orrery $RELEASE_VERSION"
  --notes-file release/RELEASE_NOTES.md
  --verify-tag
)
if [ "$PRERELEASE" = true ]; then
  args+=(--prerelease)
fi
gh release create "${args[@]}"
