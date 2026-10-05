# Releasing Orrery

Orrery releases use one version for the Git tag, npm package, and GitHub
release. A stable `package.json` version such as `0.6.0` uses tag `v0.6.0` and
the npm `latest` distribution tag. A semantic prerelease such as
`0.7.0-preview.1` uses tag `v0.7.0-preview.1` and the npm `preview`
distribution tag.

## Changelog fragments

Every pull request with a user-visible change adds one or more Markdown files
under `changelog.d`. A filename consists of a unique description or pull
request number followed by one of these suffixes:

- `.breaking.md` for an incompatible API change;
- `.added.md` for new behavior;
- `.changed.md` for a compatible behavior change;
- `.fixed.md` for a correction; or
- `.removed.md` for removed behavior.

CI uses Towncrier 26.9.0 to render the pending fragments and checks pull
requests for either a fragment or a compiled release changelog. Ordinary pull
requests do not edit `CHANGELOG.md` directly.

## Prepare a release

Run the **Prepare release** workflow from `main` after the changes intended for
a release have merged. The workflow:

1. inspects every pending fragment;
2. chooses a major increment for `.breaking.md`, a minor increment for
   `.added.md` or `.removed.md`, and a patch increment for only `.changed.md`
   or `.fixed.md` fragments;
3. updates `package.json`;
4. compiles the fragments into a dated `CHANGELOG.md` entry; and
5. opens `release/vX.Y.Z` as a pull request and explicitly starts CI for its
   commit.

The repository setting **Allow GitHub Actions to create and approve pull
requests** must be enabled before the first run. The workflow uses the
repository's short-lived GitHub Actions credential; it does not require a
stored personal access token.

Review and merge that pull request normally. The release commit must be the
current `main` commit before publication.

## Build or publish

Run the **Release** workflow from `main`. Leave **publish** disabled to build,
validate, and retain the exact archive without changing npm or GitHub. Enable
**publish** to perform the same checks, create and push the annotated `vX.Y.Z`
tag at the reviewed `main` commit, publish the archive to npm, and create the
matching GitHub release.

The workflow checks the version/tag relationship, compiled changelog, package
contents, tests, type checking, Python checks, distribution build, and
self-contained exporter before creating the tag. It refuses to move an
existing tag or publish from a commit other than the current `main` commit. A
manually pushed matching tag also starts the same publication workflow, but
the normal path is the reviewed workflow run.

For the first npm publication only:

1. Run the Release workflow from `main` with **publish** disabled.
2. Download the archive produced by that workflow.
3. Publish that exact archive from an npm account with two-factor
   authentication: `npm publish <archive> --access public --tag latest`.
4. Configure npm trusted publishing for
   `TheAxiomFoundation/orrery`, workflow `release.yml`, environment empty.
5. Remove any temporary npm automation token used during setup.
6. Run the Release workflow again from `main` with **publish** enabled. It
   creates the tag, verifies that npm contains the same archive, and creates
   the GitHub release.

Publication uses npm trusted publishing with provenance. If that exact npm
version already exists, the workflow compares the registry integrity value
with the locally built archive and refuses a mismatch. It also creates the
GitHub release with the latest Towncrier section as its release notes, the same
archive, and a `SHA256SUMS` file. A repeated run verifies the existing notes
and asset digests and refuses to replace them.

Do not move a published tag, replace release assets, or reuse a published
version. Use a new release pull request and version for every release.
