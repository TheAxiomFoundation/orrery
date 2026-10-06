import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1]


class ReleaseScriptsTest(unittest.TestCase):
    def run_page_selection(
        self,
        current_sha: str,
        tested_sha: str,
        commit_pages: str = "[]",
    ) -> str:
        with tempfile.TemporaryDirectory() as directory:
            working_directory = Path(directory)
            fake_bin = working_directory / "bin"
            fake_bin.mkdir()
            output = working_directory / "github-output"
            gh = fake_bin / "gh"
            gh.write_text(
                """#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *"git/ref/heads/main"* ]]; then
  printf '%s\\n' "$CURRENT_SHA"
else
  printf '%s\\n' "$COMMIT_PAGES"
fi
"""
            )
            gh.chmod(0o755)
            environment = {
                **os.environ,
                "PATH": f"{fake_bin}:{os.environ['PATH']}",
                "GITHUB_OUTPUT": str(output),
                "GITHUB_REPOSITORY": "TheAxiomFoundation/orrery",
                "TESTED_SHA": tested_sha,
                "CURRENT_SHA": current_sha,
                "COMMIT_PAGES": commit_pages,
            }

            subprocess.run(
                [str(ROOT / ".github/scripts/pages/select-tested-revision.sh")],
                cwd=working_directory,
                env=environment,
                check=True,
                capture_output=True,
                text=True,
            )
            return output.read_text()

    def test_npm_publish_receives_an_explicit_local_archive_path(self):
        with tempfile.TemporaryDirectory() as directory:
            working_directory = Path(directory)
            fake_bin = working_directory / "bin"
            fake_bin.mkdir()
            capture = working_directory / "npm-arguments"
            npm = fake_bin / "npm"
            npm.write_text(
                """#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = "view" ]; then
  echo "npm error code E404" >&2
  exit 1
fi
printf '%s\\n' "$@" > "$NPM_CAPTURE"
"""
            )
            npm.chmod(0o755)

            environment = {
                **os.environ,
                "PATH": f"{fake_bin}:{os.environ['PATH']}",
                "NPM_CAPTURE": str(capture),
                "NPM_TAG": "latest",
                "PACKAGE_NAME": "@axiom-foundation/orrery",
                "PACKAGE_VERSION": "1.2.3",
                "RELEASE_ASSET": "axiom-foundation-orrery-1.2.3.tgz",
            }
            environment.pop("NPM_TOKEN", None)

            subprocess.run(
                [str(ROOT / ".github/scripts/release/publish-npm.sh")],
                cwd=working_directory,
                env=environment,
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertEqual(
                capture.read_text().splitlines(),
                [
                    "publish",
                    "./release/axiom-foundation-orrery-1.2.3.tgz",
                    "--access",
                    "public",
                    "--tag",
                    "latest",
                    "--provenance",
                ],
            )

    def test_page_selection_accepts_the_exact_tested_revision(self):
        self.assertEqual(
            self.run_page_selection("tested", "tested"),
            "publish=true\n",
        )

    def test_page_selection_accepts_one_generated_release_commit(self):
        commit_pages = """[{
          "parents": [{"sha": "tested"}],
          "commit": {"message": "Update package version"},
          "files": [
            {"filename": "package.json"},
            {"filename": "CHANGELOG.md"},
            {"filename": "changelog.d/change.fixed.md"}
          ]
        }]"""
        self.assertEqual(
            self.run_page_selection("generated", "tested", commit_pages),
            "publish=true\n",
        )

    def test_page_selection_rejects_other_changes_and_newer_revisions(self):
        commit_pages = """[{
          "parents": [{"sha": "tested"}],
          "commit": {"message": "Update package version"},
          "files": [
            {"filename": "package.json"},
            {"filename": "src/core/index.ts"}
          ]
        }]"""
        self.assertEqual(
            self.run_page_selection("changed", "tested", commit_pages),
            "publish=false\n",
        )

        newer_commit = """[{
          "parents": [{"sha": "another-commit"}],
          "commit": {"message": "Update package version"},
          "files": [{"filename": "package.json"}]
        }]"""
        self.assertEqual(
            self.run_page_selection("newer", "tested", newer_commit),
            "publish=false\n",
        )


if __name__ == "__main__":
    unittest.main()
