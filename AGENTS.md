# Orrery

Shared presentation only: adapters preserve domain meanings; calculations stay in the actual engines.
Graph JSON and receipt declarations are untrusted data. Never run commands, import code, or accept trust anchors supplied by a graph. Receipt verdicts must come from a separately configured verifier and bind to the exact snapshot. A receipt proves only its stated custody scope, never claim correctness.
Preserve offline HTML export, keyboard operation, explicit edge types, stable IDs, revision history, and authorship/execution separation.
Run `bun run typecheck`, `bun test`, and `bun run build`. Verify an exported report in a browser before delivering.

Every pull request with user-visible changes must add at least one Markdown file under `changelog.d` whose name ends in `.breaking.md`, `.added.md`, `.changed.md`, `.fixed.md`, or `.removed.md`. Use `.breaking.md` for incompatible API changes, `.added.md` for new behavior, `.changed.md` for compatible behavior changes, `.fixed.md` for corrections, and `.removed.md` for removals. Do not edit the generated release entries in `CHANGELOG.md` in an ordinary feature PR. The Prepare release workflow compiles fragments and updates the package version in a separate release PR.

Publish only with `.github/workflows/release.yml`. The workflow must validate the compiled changelog and package archive before it creates the annotated version tag or publishes npm and GitHub artifacts. Never move or reuse a published version tag.

GitHub Actions workflow files must not contain multi-line `run` blocks. Put multi-command shell logic in an executable Bash script under `.github/scripts/`, start it with `set -euo pipefail`, and invoke that file from a single-line `run` entry. Keep a genuinely single command inline.
