#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${TESTED_SHA:?TESTED_SHA is required}"

current_sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')
if [ "$current_sha" = "$TESTED_SHA" ]; then
  echo "publish=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

commit_pages=$(gh api --paginate --slurp \
  "repos/$GITHUB_REPOSITORY/commits/$current_sha?per_page=100")
parent_sha=$(jq --raw-output \
  '.[0].parents | if length == 1 then .[0].sha else "" end' <<<"$commit_pages")
subject=$(jq --raw-output '.[0].commit.message | split("\n")[0]' <<<"$commit_pages")
changed_files=$(jq --raw-output '[.[] | .files[]?.filename] | unique[]' <<<"$commit_pages")

generated_release=false
if [ "$parent_sha" = "$TESTED_SHA" ] && \
   [ "$subject" = "Update package version" ] && \
   [ -n "$changed_files" ]; then
  generated_release=true
  while IFS= read -r file; do
    case "$file" in
      package.json|CHANGELOG.md|changelog.d/*) ;;
      *) generated_release=false ;;
    esac
  done <<<"$changed_files"
fi

if [ "$generated_release" = true ]; then
  echo "publish=true" >> "$GITHUB_OUTPUT"
  echo "::notice::Publishing tested revision $TESTED_SHA; main adds only generated release metadata in $current_sha"
  exit 0
fi

echo "publish=false" >> "$GITHUB_OUTPUT"
echo "::notice::Skipping superseded revision $TESTED_SHA; main is $current_sha"
