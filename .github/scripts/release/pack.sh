#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_ASSET:?RELEASE_ASSET is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"

mkdir release
npm pack --json --pack-destination release > release/pack.json
bun scripts/release.ts validate-pack \
  --tag "$RELEASE_TAG" \
  --pack-json release/pack.json > release/validated.json
sha256sum "release/$RELEASE_ASSET" > release/SHA256SUMS
