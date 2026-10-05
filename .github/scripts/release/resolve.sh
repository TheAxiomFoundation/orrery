#!/usr/bin/env bash
set -euo pipefail

: "${EVENT_NAME:?EVENT_NAME is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GIT_REF:?GIT_REF is required}"

if [ "$EVENT_NAME" = "push" ]; then
  : "${REF_NAME:?REF_NAME is required for a tag push}"
  tag="$REF_NAME"
  publish=true
else
  tag="v$(node --print "require('./package.json').version")"
  publish="${REQUESTED_PUBLISH:-false}"
fi

if [ "$publish" = true ] && [ "$EVENT_NAME" = "workflow_dispatch" ] && [ "$GIT_REF" != "refs/heads/main" ]; then
  echo "Publishing requires a workflow run from main." >&2
  exit 1
fi

metadata=$(bun scripts/release.ts validate-changelog --tag "$tag")
{
  echo "tag=$(jq --raw-output .tag <<<"$metadata")"
  echo "name=$(jq --raw-output .name <<<"$metadata")"
  echo "version=$(jq --raw-output .version <<<"$metadata")"
  echo "npm_tag=$(jq --raw-output .npmTag <<<"$metadata")"
  echo "prerelease=$(jq --raw-output .prerelease <<<"$metadata")"
  echo "asset=$(jq --raw-output .assetName <<<"$metadata")"
  echo "publish=$publish"
} >> "$GITHUB_OUTPUT"
