#!/usr/bin/env bash
# Tests scripts/check_line_limits.py against scratch git repositories.
#
# Usage: bash tests/ci/check-line-limits-test.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/scripts/check_line_limits.py"

failures=0
pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }

# All scratch repos live under one temp parent, removed on exit.
PARENT="$(mktemp -d)"
trap 'rm -rf "$PARENT"' EXIT

# ── Helpers ────────────────────────────────────────────────────────────────

new_repo() {
    local repo
    repo="$(mktemp -d "$PARENT/repo.XXXXXX")"
    git -C "$repo" init -q
    git -C "$repo" config user.email test@example.com
    git -C "$repo" config user.name test
    printf '%s' "$repo"
}

# gen_lines <file> <n> — write a text file with exactly n distinct lines.
gen_lines() {
    local file="$1" n="$2" seed
    seed="$(basename "$file")"
    awk -v seed="$seed" -v n="$n" 'BEGIN{ for (i=1; i<=n; i++) printf "%s %d\n", seed, i }' > "$file"
}

commit() { # <repo> <message> -> echoes the new commit SHA
    local repo="$1" msg="$2"
    git -C "$repo" add -A
    git -C "$repo" commit -qm "$msg"
    git -C "$repo" rev-parse HEAD
}

# run_check <repo> <base_sha> <head_sha> -> echoes the checker's stdout+stderr
run_check() {
    local repo="$1" base="$2" head="$3"
    ( cd "$repo" && BASE_SHA="$base" HEAD_SHA="$head" python3 "$SCRIPT" )
}

# expect_violation <desc> <repo> <base> <head> <file-that-must-appear> [files-that-must-not-appear...]
expect_violation() {
    local desc="$1" repo="$2" base="$3" head="$4" must="$5"; shift 5
    local out code
    set +e
    out="$(run_check "$repo" "$base" "$head" 2>&1)"
    code=$?
    set -e
    if [ "$code" -eq 0 ]; then
        fail "$desc (expected a violation, but the checker exited 0)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    fi
    if [[ "$out" != *"FAIL"* ]]; then
        fail "$desc (expected a FAIL in output)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    fi
    if [[ "$out" != *"$must"* ]]; then
        fail "$desc (expected '$must' in output)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    fi
    local forbidden
    for forbidden in "$@"; do
        if [[ "$out" == *"$forbidden"* ]]; then
            fail "$desc ('$forbidden' should NOT be flagged)"
            printf '      output:\n%s\n' "$out" | sed 's/^/      /'
            return
        fi
    done
    pass "$desc"
}

# expect_clean <desc> <repo> <base> <head>
expect_clean() {
    local desc="$1" repo="$2" base="$3" head="$4"
    local out
    out="$(run_check "$repo" "$base" "$head" 2>&1)" || {
        fail "$desc (expected clean, got violations)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    }
    pass "$desc"
}

# expect_error <desc> <repo> <base> <head> — must fail non-zero with a git error.
expect_error() {
    local desc="$1" repo="$2" base="$3" head="$4"
    local out code
    set +e
    out="$(run_check "$repo" "$base" "$head" 2>&1)"
    code=$?
    set -e
    if [ "$code" -eq 0 ]; then
        fail "$desc (expected a non-zero exit, got 0)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    fi
    if [[ "$out" != *"ERROR"* ]]; then
        fail "$desc (expected an ERROR in output)"
        printf '      output:\n%s\n' "$out" | sed 's/^/      /'
        return
    fi
    pass "$desc"
}

# ── Scenario 1: new files vs the 500-line cap ──────────────────────────────
repo="$(new_repo)"
gen_lines "$repo/placeholder.ts" 1
base1="$(commit "$repo" base)"

gen_lines "$repo/ok.ts" 500        # A: exactly at cap -> allowed
gen_lines "$repo/big.ts" 501       # A: one over cap -> violation
head1="$(commit "$repo" head)"

echo "Scenario 1: new files vs the 500-line cap"
expect_violation "new file over 500 lines is caught" "$repo" "$base1" "$head1" "big.ts" "ok.ts"

# ── Scenario 2: existing files are frozen ──────────────────────────────────
repo="$(new_repo)"
gen_lines "$repo/frozen.ts" 300
base2="$(commit "$repo" base)"

gen_lines "$repo/frozen.ts" 301    # M: grew by one -> violation (frozen)
head2="$(commit "$repo" head)"

echo "Scenario 2: existing files may not grow"
expect_violation "existing file growth is caught" "$repo" "$base2" "$head2" "frozen.ts"

# ── Scenario 3: existing file may shrink ───────────────────────────────────
repo="$(new_repo)"
gen_lines "$repo/shrink.ts" 300
base3="$(commit "$repo" base)"

gen_lines "$repo/shrink.ts" 250    # M: shrank -> allowed
head3="$(commit "$repo" head)"

echo "Scenario 3: existing files may shrink"
expect_clean "existing file shrinking passes" "$repo" "$base3" "$head3"

# ── Scenario 4: allowlisted files may grow (en/fr) ─────────────────────────
repo="$(new_repo)"
mkdir -p "$repo/src/lib/i18n"
gen_lines "$repo/src/lib/i18n/en.ts" 300
printf '# allowlist\nsrc/lib/i18n/en.ts\n' > "$repo/.line-limit-allowlist"
base4="$(commit "$repo" base)"

gen_lines "$repo/src/lib/i18n/en.ts" 800   # allowlisted -> may grow
head4="$(commit "$repo" head)"

echo "Scenario 4: allowlisted files may grow"
expect_clean "an allowlisted file may grow" "$repo" "$base4" "$head4"

# ── Scenario 5: adding a file to the allowlist is the reviewable escape ────
repo="$(new_repo)"
printf '' > "$repo/.line-limit-allowlist"   # empty allowlist -> strict
gen_lines "$repo/feature.ts" 200
base5="$(commit "$repo" base)"

printf 'feature.ts\n' > "$repo/.line-limit-allowlist"  # now allowlisted
gen_lines "$repo/feature.ts" 600   # grew past 500, but now allowlisted
head5="$(commit "$repo" head)"

echo "Scenario 5: adding a file to the allowlist permits growth"
expect_clean "a newly-allowlisted file may grow" "$repo" "$base5" "$head5"

# ── Scenario 6: markdown files are excluded ────────────────────────────────
repo="$(new_repo)"
gen_lines "$repo/README.md" 100
base6="$(commit "$repo" base)"

gen_lines "$repo/README.md" 1500   # grew a lot -> would violate if counted
head6="$(commit "$repo" head)"

echo "Scenario 6: markdown files are excluded from the cap"
expect_clean "markdown files are not subject to the cap" "$repo" "$base6" "$head6"

# ── Scenario 7: git failure fails closed ───────────────────────────────────
repo="$(new_repo)"
gen_lines "$repo/a.ts" 10
base7="$(commit "$repo" base)"

echo "Scenario 7: a git failure fails the check instead of passing"
expect_error "invalid BASE_SHA exits non-zero with an error" "$repo" "DEADBEEF-not-a-commit" "HEAD"

# ── Cleanup ─────────────────────────────────────────────────────────────────
# The EXIT trap removes the temp parent and every scratch repo under it.

if [ "$failures" -gt 0 ]; then
    printf '\n%d check(s) failed\n' "$failures"
    exit 1
fi
echo
echo "All line-limit checks passed."
