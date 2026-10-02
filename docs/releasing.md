# Releasing Orrery

Orrery releases use one version for the Git tag, npm package, and GitHub
release. A stable `package.json` version such as `0.6.0` uses tag `v0.6.0` and
the npm `latest` distribution tag. A semantic prerelease such as
`0.7.0-preview.1` uses tag `v0.7.0-preview.1` and the npm `preview`
distribution tag.

Before tagging, merge the version, documentation, and generated-lockfile
changes into `main` and wait for CI to pass. Run the Release workflow manually
to build and retain the exact archive without publishing it. The workflow
checks the version/tag relationship, package contents, tests, type checking,
Python checks, distribution build, and self-contained exporter.

For the first npm publication only:

1. Download the archive produced by the manual Release workflow.
2. Publish that exact archive from an npm account with two-factor
   authentication: `npm publish <archive> --access public --tag latest`.
3. Configure npm trusted publishing for
   `TheAxiomFoundation/orrery`, workflow `release.yml`, environment empty.
4. Remove any temporary npm automation token used during setup.
5. Push the matching version tag from the reviewed `main` commit.

The tag-triggered workflow requires the tagged commit to be present in `main`.
It publishes through npm trusted publishing with provenance. If that exact npm
version already exists, it compares the registry integrity value with the
locally built archive and refuses a mismatch. It also creates the GitHub
release with the same archive and a `SHA256SUMS` file. A repeated run verifies
the existing GitHub asset digests and refuses to replace them.

Do not move a published tag, replace release assets, or reuse a published
version. Increment `package.json` and create a new tag for every release.
