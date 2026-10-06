#!/usr/bin/env bash
set -euo pipefail

python3 .github/bump_version.py
version=$(node --print "require('./package.json').version")
uvx --from towncrier==26.9.0 towncrier build --yes --version "$version"
bun scripts/release.ts validate-changelog --tag "v$version" > /dev/null
