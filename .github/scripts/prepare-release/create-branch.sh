#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"

branch="release/$RELEASE_TAG"
ref="refs/heads/$branch"
git ls-remote --heads origin > all-remote-branches.txt
listed=$(awk -v ref="$ref" '$2 == ref { print $1 }' all-remote-branches.txt)

set +e
direct=$(git ls-remote --exit-code --heads origin "$ref")
direct_status=$?
set -e

if [ "$direct_status" -eq 0 ]; then
  direct_commit=$(awk '{ print $1 }' <<<"$direct")
  if [ "$listed" != "$direct_commit" ]; then
    echo "Remote branch list and exact branch lookup disagree." >&2
    exit 1
  fi
  echo "Remote branch $branch already exists." >&2
  exit 1
fi
if [ "$direct_status" -ne 2 ]; then
  echo "Exact remote branch lookup failed." >&2
  exit 1
fi
if [ -n "$listed" ]; then
  echo "Remote branch list and exact branch lookup disagree." >&2
  exit 1
fi

git switch --create "$branch"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add --all -- package.json CHANGELOG.md changelog.d
git diff --cached --check
git commit --message "Prepare Orrery $RELEASE_VERSION"
git push --set-upstream origin "$branch"
