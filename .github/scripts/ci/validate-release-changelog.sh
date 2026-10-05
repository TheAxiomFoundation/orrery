#!/usr/bin/env bash
set -euo pipefail

tag="v$(node --print "require('./package.json').version")"
bun scripts/release.ts validate-changelog --tag "$tag" > /dev/null
