#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

git fetch origin main
current_main=$(git rev-parse origin/main)
if [ "$current_main" != "$GITHUB_SHA" ]; then
  echo "::notice::Skipping superseded revision $GITHUB_SHA; main is $current_main"
  echo "release=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

write_outputs() {
  local metadata=$1
  local commit_sha=$2
  {
    echo "release=true"
    echo "commit_sha=$commit_sha"
    echo "tag=$(jq --raw-output .tag <<<"$metadata")"
    echo "name=$(jq --raw-output .name <<<"$metadata")"
    echo "version=$(jq --raw-output .version <<<"$metadata")"
    echo "npm_tag=$(jq --raw-output .npmTag <<<"$metadata")"
    echo "prerelease=$(jq --raw-output .prerelease <<<"$metadata")"
    echo "asset=$(jq --raw-output .assetName <<<"$metadata")"
  } >> "$GITHUB_OUTPUT"
}

fragments=()
while IFS= read -r -d '' fragment; do
  fragments+=("$fragment")
done < <(find changelog.d -maxdepth 1 -type f ! -name '.gitkeep' -print0)

if [ "${#fragments[@]}" -eq 0 ]; then
  if [ "$(git log -1 --pretty=%s)" != "Update package version" ]; then
    echo "::notice::No changelog fragments require publication."
    echo "release=false" >> "$GITHUB_OUTPUT"
    exit 0
  fi
  metadata=$(bun scripts/release.ts current)
  tag=$(jq --raw-output .tag <<<"$metadata")
  bun scripts/release.ts validate-changelog --tag "$tag" > /dev/null
  write_outputs "$metadata" "$GITHUB_SHA"
  exit 0
fi

plan=$(bun scripts/release.ts plan --write)
version=$(jq --raw-output .version <<<"$plan")
tag=$(jq --raw-output .tag <<<"$plan")

uvx --from towncrier==26.9.0 towncrier build --yes --version "$version"
metadata=$(bun scripts/release.ts validate-changelog --tag "$tag")

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add --all -- package.json CHANGELOG.md changelog.d
git diff --cached --check
git commit --message "Update package version"
git push origin HEAD:main

commit_sha=$(git rev-parse HEAD)
write_outputs "$metadata" "$commit_sha"
