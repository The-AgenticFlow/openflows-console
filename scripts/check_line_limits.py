#!/usr/bin/env python3
"""Enforce per-file line-count limits between two git revisions.

Rule for openflows-console:
    - Newly added files:            <= MAX_LINES (default 500)
    - Existing files:               frozen at their current count (can only shrink)
    - Allowlisted files:            may grow freely (see ALLOWLIST_FILE)

An allowlisted file is a reviewable exception for "necessary" growth: adding a
path to the allowlist file is itself a PR change reviewers see. By default the
allowlist contains the i18n dictionaries (en/fr), which are expected to grow.

The baseline is the merge base of BASE_SHA and HEAD_SHA (not the base branch
tip), so an unrelated PR is never flagged just because the base branch changed.

Scope: tracked source/config text files. Markdown/docs, lockfiles, build/vendored
output, generated artifacts and binary files are excluded.

Usage (from the repository root):
    BASE_SHA=<base> HEAD_SHA=<head> python3 scripts/check_line_limits.py
    MAX_LINES overrides the new-file cap (default 500).
    ALLOWLIST_FILE overrides the allowlist path (default .line-limit-allowlist).

Exits 0 if every file is within its limit, 1 otherwise. Fails hard (non-zero)
if git itself errors, so a broken run never looks green.
"""

import fnmatch
import os
import subprocess
import sys

MAX_LINES = int(os.environ.get("MAX_LINES", "500"))
BASE_SHA = os.environ.get("BASE_SHA", "")
HEAD_SHA = os.environ.get("HEAD_SHA", "HEAD")
ALLOWLIST_FILE = os.environ.get("ALLOWLIST_FILE", ".line-limit-allowlist")

# The merge base of BASE_SHA and HEAD_SHA, resolved in main(). All base-side
# reads and changed-file detection use this, not the base branch tip.
MERGE_BASE = ""

# Paths/globs allowed to be large (lockfiles, build/vendored output, generated
# artifacts, docs). A trailing "/" means "any file under this directory".
# Name-only patterns (no "/") also match against the basename.
IGNORED_PATTERNS = [
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "npm-shrinkwrap.json",
    "go.sum",
    "poetry.lock",
    "uv.lock",
    "Pipfile.lock",
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.wasm",
    "*.o",
    "*.so",
    "*.dylib",
    "*.dll",
    "*.exe",
    "*.md",
    "*.markdown",
    ".line-limit-allowlist",
    # Config / dotfiles / workflows: not source, legitimately change
    ".github/",
    ".dockerignore",
    ".gitignore",
    ".env",
    ".env.example",
    ".env.local",
    ".env.production",
    ".env.development",
    "Dockerfile",
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "playwright.config.ts",
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "out/",
    "coverage/",
    "vendor/",
]


def run_git(args):
    """Run git, raising a clear error on failure (fail-closed)."""
    result = subprocess.run(["git"] + args, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed (exit {result.returncode}):\n"
            f"{result.stderr.decode(errors='replace').strip()}"
        )
    return result


def blob(sha: str, path: str) -> bytes:
    """Raw bytes of a file at a revision. A missing/unreadable blob is an error."""
    return run_git(["cat-file", "blob", f"{sha}:{path}"]).stdout


def line_count(sha: str, path: str) -> int:
    """Number of logical lines of a file at a revision."""
    return len(blob(sha, path).splitlines())


def is_binary(sha: str, path: str) -> bool:
    """A file is treated as binary if a NUL byte appears in its first 8 KiB."""
    return b"\x00" in blob(sha, path)[:8192]


def is_ignored(path: str) -> bool:
    base = os.path.basename(path)
    for pattern in IGNORED_PATTERNS:
        if pattern.endswith("/"):
            if path.startswith(pattern):
                return True
        elif fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(base, pattern):
            return True
    return False


def load_allowlist():
    """Paths/globs that may grow without limit (reviewable exceptions)."""
    allowlist = set()
    try:
        with open(ALLOWLIST_FILE, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                allowlist.add(line)
    except FileNotFoundError:
        pass
    return allowlist


def is_allowlisted(path: str, allowlist) -> bool:
    base = os.path.basename(path)
    return any(
        fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(base, pattern)
        for pattern in allowlist
    )


def check_file(base_path, head_path, allowlist):
    """Return a violation string for a changed file, or None."""
    if not head_path or is_ignored(head_path):
        return None
    if is_binary(HEAD_SHA, head_path):
        return None  # binary files are skipped
    if is_allowlisted(head_path, allowlist):
        return None  # reviewable exception: may grow

    if base_path:
        base_count = line_count(MERGE_BASE, base_path)
        allowed = base_count  # existing files are frozen
    else:
        base_count = 0
        allowed = MAX_LINES  # new files

    head_count = line_count(HEAD_SHA, head_path)
    if head_count <= allowed:
        return None

    if base_count == 0:
        reason = f"new file exceeds the {MAX_LINES}-line cap"
    else:
        reason = (
            f"existing file grew from {base_count} to {head_count} lines; "
            "existing files may only shrink unless allowlisted"
        )
    return f"FAIL  {head_path:<55} {head_count:>6} lines (limit {allowed}): {reason}"


def changed_files(base: str, head: str):
    """Yield (base_path, head_path) pairs for each added/modified file.

    base_path is None for brand-new files. Uses git rename detection so a
    rename keeps its baseline.
    """
    result = run_git(["diff", "-z", "--find-renames", "--name-status", base, head])
    fields = result.stdout.decode(errors="replace").split("\x00")
    i = 0
    while i < len(fields):
        status = fields[i]
        i += 1
        if not status:
            continue
        if status.startswith("R"):
            old = fields[i]
            new = fields[i + 1]
            i += 2
            yield old, new
        elif status.startswith("C"):
            # Copy: treat the new path as its own file (cap = MAX_LINES).
            new = fields[i]
            i += 1
            yield None, new
        elif status in ("A", "M", "T"):
            path = fields[i]
            i += 1
            yield (None if status == "A" else path), path
        else:  # D (delete), U, X, B ... consume the path and move on
            i += 1


def main() -> int:
    global MERGE_BASE
    if not BASE_SHA:
        print(
            "BASE_SHA not set (not a pull_request run); "
            "skipping line-limit check (PRs only)."
        )
        return 0

    print(
        f"Checking per-file line limits between {BASE_SHA} and {HEAD_SHA} "
        f"(new-file cap {MAX_LINES})..."
    )
    allowlist = load_allowlist()

    try:
        MERGE_BASE = run_git(["merge-base", BASE_SHA, HEAD_SHA]).stdout.decode().strip()
        violations = []
        for base_path, head_path in changed_files(MERGE_BASE, HEAD_SHA):
            violation = check_file(base_path, head_path, allowlist)
            if violation:
                violations.append(violation)
    except RuntimeError as error:
        print(f"ERROR: {error}")
        return 1

    if violations:
        print("\n".join(violations))
        print(
            f"\n{len(violations)} file(s) exceed their line-count limit.\n"
            "Refactor rather than grow: split large files into focused modules, "
            "or add a reviewed exception to the allowlist."
        )
        return 1

    print("OK: all changed files are within their line-count limits.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
