#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_SHA:?EXPECTED_SHA is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"

ref="refs/tags/$RELEASE_TAG"
git ls-remote --tags origin > all-remote-tags.txt
listed=$(awk -v ref="$ref" '$2 == ref { print $1 }' all-remote-tags.txt)

set +e
direct=$(git ls-remote --exit-code --refs origin "$ref")
direct_status=$?
set -e

if [ "$direct_status" -eq 0 ]; then
  direct_object=$(awk '{ print $1 }' <<<"$direct")
  if [ "$listed" != "$direct_object" ]; then
    echo "Remote tag list and exact tag lookup disagree." >&2
    exit 1
  fi
elif [ "$direct_status" -eq 2 ]; then
  if [ -n "$listed" ]; then
    echo "Remote tag list and exact tag lookup disagree." >&2
    exit 1
  fi
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git tag --annotate "$RELEASE_TAG" --message "Orrery $RELEASE_VERSION"
  git push origin "$ref"
else
  echo "Exact remote tag lookup failed." >&2
  exit 1
fi

git fetch --force origin "$ref:$ref"
if [ "$(git cat-file -t "$RELEASE_TAG")" != tag ]; then
  echo "Remote tag $RELEASE_TAG must be annotated." >&2
  exit 1
fi
if [ "$(git rev-list --max-count=1 "$RELEASE_TAG")" != "$EXPECTED_SHA" ]; then
  echo "Remote tag $RELEASE_TAG points to a different commit." >&2
  exit 1
fi
