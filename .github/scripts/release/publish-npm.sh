#!/usr/bin/env bash
set -euo pipefail

: "${NPM_TAG:?NPM_TAG is required}"
: "${PACKAGE_NAME:?PACKAGE_NAME is required}"
: "${PACKAGE_VERSION:?PACKAGE_VERSION is required}"
: "${RELEASE_ASSET:?RELEASE_ASSET is required}"

if [ -n "${NPM_TOKEN:-}" ]; then
  : "${RUNNER_TEMP:?RUNNER_TEMP is required when NPM_TOKEN is configured}"
  npm_config="$RUNNER_TEMP/orrery-npmrc"
  printf '%s\n' "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > "$npm_config"
  export NPM_CONFIG_USERCONFIG="$npm_config"
fi

set +e
npm view "$PACKAGE_NAME" versions --json > registry-versions.json 2> registry-list.error
list_status=$?
npm view "$PACKAGE_NAME@$PACKAGE_VERSION" dist.integrity --json > registry-version.json 2> registry-direct.error
direct_status=$?
set -e

listed=false
if [ "$list_status" -eq 0 ]; then
  listed=$(jq --arg version "$PACKAGE_VERSION" \
    'if type == "array" then index($version) != null else . == $version end' \
    registry-versions.json)
elif ! grep --quiet 'E404' registry-list.error; then
  cat registry-list.error
  exit 1
fi

if [ "$direct_status" -eq 0 ]; then
  if [ "$listed" != true ]; then
    echo "npm list and exact-version lookup disagree" >&2
    exit 1
  fi
  published_integrity=$(jq --raw-output . registry-version.json)
  local_integrity=$(jq --raw-output .integrity release/validated.json)
  if [ "$published_integrity" != "$local_integrity" ]; then
    echo "published npm archive differs from the locally built archive" >&2
    exit 1
  fi
else
  if ! grep --quiet 'E404' registry-direct.error; then
    cat registry-direct.error
    exit 1
  fi
  if [ "$listed" = true ]; then
    echo "npm list and exact-version lookup disagree" >&2
    exit 1
  fi
  npm publish "./release/$RELEASE_ASSET" \
    --access public \
    --tag "$NPM_TAG" \
    --provenance
fi
