#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

metadata=$(bun scripts/release.ts current)
{
  echo "commit_sha=$(git rev-parse HEAD)"
  echo "tag=$(jq --raw-output .tag <<<"$metadata")"
  echo "name=$(jq --raw-output .name <<<"$metadata")"
  echo "version=$(jq --raw-output .version <<<"$metadata")"
  echo "npm_tag=$(jq --raw-output .npmTag <<<"$metadata")"
  echo "prerelease=$(jq --raw-output .prerelease <<<"$metadata")"
  echo "asset=$(jq --raw-output .assetName <<<"$metadata")"
} >> "$GITHUB_OUTPUT"
