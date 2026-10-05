# Releasing Orrery

Orrery publishes automatically after a pull request containing changelog
fragments merges into `main`. The release uses one version for the annotated
Git tag, npm package, and GitHub release.

## Changelog fragments

Every pull request with a user-visible change adds one or more Markdown files
under `changelog.d`. A filename consists of a unique description or pull
request number followed by one of these suffixes:

- `.breaking.md` for an incompatible API change;
- `.added.md` for new behavior;
- `.changed.md` for a compatible behavior change;
- `.fixed.md` for a correction; or
- `.removed.md` for removed behavior.

CI renders the pending fragments with Towncrier and requires each pull request
to supply a valid fragment. Ordinary pull requests do not edit `CHANGELOG.md`
or change the package version directly.

## Automated publication

When changelog fragments reach `main`, the **Release** workflow:

1. verifies that it is processing the current `main` commit;
2. determines the next semantic version from all pending fragments;
3. updates `package.json` and compiles the fragments into `CHANGELOG.md`;
4. commits the generated files to `main` with the message `Update package version`;
5. checks out that exact generated commit and runs the type checks, tests, and
   distribution validation;
6. creates an annotated `vX.Y.Z` tag for that commit;
7. publishes the package to npm with provenance; and
8. creates the matching GitHub release with the Towncrier notes, package
   archive, and checksums.

The first stable release finalizes the semantic prerelease already stored in
`package.json`. After that, `.breaking.md` selects a major increment,
`.added.md` or `.removed.md` selects a minor increment, and releases containing
only `.changed.md` or `.fixed.md` select a patch increment.

The workflow is safe to retry from the generated `Update package version`
commit. If the exact npm version or GitHub release already exists, it verifies
the published archive, release notes, and asset digests instead of replacing
them. A newer `main` commit causes an older queued run to stop; the newer run
includes all pending fragments.

## npm authentication

Configure npm trusted publishing for repository `TheAxiomFoundation/orrery`
and workflow `release.yml`, and allow the trusted publisher to run
`npm publish`. Publication then uses GitHub's short-lived OpenID Connect
identity and npm provenance without storing an npm token.

For the first publication, before package settings exist for trusted
publishing, add an Actions secret named `NPM_TOKEN` containing a granular npm
token with permission to publish the scoped package and bypass two-factor
authentication. The same automated workflow uses it for the initial
publication. Then configure trusted publishing, remove the secret, and revoke
the initial token.

Do not move a published tag, replace release assets, or reuse a published
version. Correct a released package with a new pull request, changelog fragment,
and version.
