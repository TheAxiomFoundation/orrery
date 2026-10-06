"""Infer the semantic-version increment from Towncrier fragments."""

import json
import sys
from pathlib import Path


def get_current_version(package_path: Path) -> str:
    package = json.loads(package_path.read_text())
    version = package.get("version")
    if not isinstance(version, str):
        print("Could not find version in package.json", file=sys.stderr)
        raise SystemExit(1)
    parts = version.split(".")
    if len(parts) != 3 or any(not part.isdigit() for part in parts):
        print(f"Invalid stable semantic version in package.json: {version}", file=sys.stderr)
        raise SystemExit(1)
    return version


def infer_bump(changelog_dir: Path) -> str:
    fragments = [
        fragment
        for fragment in changelog_dir.iterdir()
        if fragment.is_file() and fragment.name != ".gitkeep"
    ]
    if not fragments:
        print("No changelog fragments found", file=sys.stderr)
        raise SystemExit(1)

    categories = set()
    for fragment in fragments:
        parts = fragment.name.split(".")
        if len(parts) >= 3 and parts[-1] == "md":
            categories.add(parts[-2])

    if "breaking" in categories:
        return "major"
    if "added" in categories or "removed" in categories:
        return "minor"
    if categories and categories <= {"changed", "fixed"}:
        return "patch"

    invalid = ", ".join(sorted(fragment.name for fragment in fragments))
    print(f"Invalid changelog fragment names: {invalid}", file=sys.stderr)
    raise SystemExit(1)


def bump_version(version: str, bump: str) -> str:
    major, minor, patch = (int(part) for part in version.split("."))
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def update_package(path: Path, new_version: str) -> None:
    package = json.loads(path.read_text())
    package["version"] = new_version
    path.write_text(json.dumps(package, indent=2) + "\n")
    print(f"  Updated {path}")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    package_path = root / "package.json"
    changelog_dir = root / "changelog.d"

    current = get_current_version(package_path)
    bump = infer_bump(changelog_dir)
    new = bump_version(current, bump)

    print(f"Version: {current} -> {new} ({bump})")
    update_package(package_path, new)


if __name__ == "__main__":
    main()
