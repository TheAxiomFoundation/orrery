#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

metadata=$(bun scripts/release.ts plan --write)
version=$(jq --raw-output .version <<<"$metadata")
tag=$(jq --raw-output .tag <<<"$metadata")
increment=$(jq --raw-output .increment <<<"$metadata")

uvx --from towncrier==26.9.0 towncrier build --yes --version "$version"
bun scripts/release.ts validate-changelog --tag "$tag" > /dev/null

{
  echo "version=$version"
  echo "tag=$tag"
  echo "increment=$increment"
} >> "$GITHUB_OUTPUT"
