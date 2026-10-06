import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / ".github" / "bump_version.py"
SPEC = importlib.util.spec_from_file_location("bump_version", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
bump_version = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bump_version)


class BumpVersionTest(unittest.TestCase):
    def test_infers_the_largest_increment_from_fragments(self):
        with tempfile.TemporaryDirectory() as directory:
            fragments = Path(directory)
            (fragments / "one.fixed.md").write_text("Fix one.\n")
            self.assertEqual(bump_version.infer_bump(fragments), "patch")

            (fragments / "two.added.md").write_text("Add two.\n")
            self.assertEqual(bump_version.infer_bump(fragments), "minor")

            (fragments / "three.breaking.md").write_text("Break three.\n")
            self.assertEqual(bump_version.infer_bump(fragments), "major")

    def test_rejects_missing_and_unknown_fragments(self):
        with tempfile.TemporaryDirectory() as directory:
            fragments = Path(directory)
            with self.assertRaises(SystemExit):
                bump_version.infer_bump(fragments)

            (fragments / "one.notes.md").write_text("Unknown.\n")
            with self.assertRaises(SystemExit):
                bump_version.infer_bump(fragments)

    def test_updates_package_json_without_changing_other_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            package_path = Path(directory) / "package.json"
            package_path.write_text(
                json.dumps({"name": "example", "version": "1.2.3"}) + "\n"
            )

            self.assertEqual(bump_version.get_current_version(package_path), "1.2.3")
            self.assertEqual(bump_version.bump_version("1.2.3", "patch"), "1.2.4")
            self.assertEqual(bump_version.bump_version("1.2.3", "minor"), "1.3.0")
            self.assertEqual(bump_version.bump_version("1.2.3", "major"), "2.0.0")

            bump_version.update_package(package_path, "1.3.0")
            self.assertEqual(
                json.loads(package_path.read_text()),
                {"name": "example", "version": "1.3.0"},
            )

    def test_rejects_prerelease_and_nonsemantic_versions(self):
        with tempfile.TemporaryDirectory() as directory:
            package_path = Path(directory) / "package.json"
            for version in ("1.2.3-preview.1", "next", "1.2"):
                package_path.write_text(json.dumps({"version": version}) + "\n")
                with self.assertRaises(SystemExit):
                    bump_version.get_current_version(package_path)


if __name__ == "__main__":
    unittest.main()
