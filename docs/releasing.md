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

1. runs `.github/bump_version.py` to determine the next semantic version from
   all pending fragments and update `package.json`;
2. compiles the fragments into `CHANGELOG.md` with Towncrier;
3. uses `EndBug/add-and-commit` to commit the generated files to `main` with
   the message `Update package version`;
4. starts publication only when that action reports that it created the commit;
5. checks out that exact generated commit and runs the type checks, tests, and
   distribution validation;
6. creates an annotated `vX.Y.Z` tag for that commit;
7. publishes the package to npm with provenance; and
8. creates the matching GitHub release with the Towncrier notes, package
   archive, and checksums.

`.breaking.md` selects a major increment, `.added.md` or `.removed.md` selects
a minor increment, and releases containing only `.changed.md` or `.fixed.md`
select a patch increment.

If a publication step fails after versioning succeeds, rerun the failed
publication job. If the exact npm version or GitHub release already exists,
the job verifies the published archive, release notes, and asset digests
instead of replacing them.

## npm authentication

Configure npm trusted publishing for repository `TheAxiomFoundation/orrery`
and workflow `release.yml`, and allow the trusted publisher to run
`npm publish`. Publication then uses GitHub's short-lived OpenID Connect
identity and npm provenance without storing an npm token.

The workflow runs on a GitHub-hosted runner, grants `id-token: write`, and uses
an npm client that supports trusted publishing. It does not accept a traditional
publishing token. Confirm the trusted-publisher configuration before merging a
change with a changelog fragment; npm validates the repository, workflow
filename, and direct-publication permission only when publication is attempted.

Restrict traditional token-based publication in the npm package settings. Do
not store an npm publishing token in GitHub Actions secrets.

Do not move a published tag, replace release assets, or reuse a published
version. Correct a released package with a new pull request, changelog fragment,
and version.
