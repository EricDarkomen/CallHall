#!/usr/bin/env bash
# Get this shift out of the door.
#
# The one thing this must do that nothing else does is CHANGE THE VERSION
# STRING. Every script and stylesheet in index.html and editor.html is loaded
# with a `?v=` on it, and that string is the only thing standing between a
# player and a cached copy of last week's game. Ship a change without moving it
# and a returning browser will serve whichever of the old files it still has —
# not all of them, and not none of them, which is the bad case: a new engine
# reading an old level, for ten minutes, silently. It happened twice before this
# script existed, which is why it exists.
#
# It also runs the checks that are cheap and catch the two things that have
# actually gone out broken before: a stale sprite atlas, and a JavaScript file
# that does not parse.
#
# What it deliberately does NOT do is publish. The public repository is built
# from this one and its remote is not recorded here; see the README. This gets
# the working tree into a releasable state and tells you what it did.
#
#   scripts/release.sh            check and stamp, leave the change staged
#   scripts/release.sh --check    check and report only; change nothing
#   scripts/release.sh --commit   check, stamp, and commit the stamp
#
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-stamp}"
say() { printf '%s\n' "$*" >&2; }
die() { printf 'release: %s\n' "$*" >&2; exit 1; }

# ---- what is being released ------------------------------------------------
# The commit the version string will name. HEAD rather than a fresh hash: the
# version is meant to identify the CONTENT it was built from, so two people
# releasing the same commit stamp the same string and a redeploy of an unchanged
# tree does not needlessly bust every cache.
VER="$(git rev-parse --short=7 HEAD)"
OLD="$(sed -n 's/.*?v=\([0-9a-f]\{5,\}\).*/\1/p' index.html | head -1)"
say "release: HEAD is $VER, index.html currently stamped ${OLD:-(none)}"

# ---- checks ----------------------------------------------------------------
# Everything the browser is going to run, parsed. `node --check` is not a linter
# and is not pretending to be one; it is the difference between a typo you find
# here and a blank screen you find on a phone.
say "release: parsing every shipped script..."
BAD=0
for f in engine/*.js data/*.js minigames/*.js editor/*.js art/sprites/manifest.js; do
  [ -e "$f" ] || continue
  node --check "$f" >/dev/null 2>&1 || { say "  FAILS TO PARSE: $f"; BAD=1; }
done
[ "$BAD" -eq 0 ] || die "one or more scripts do not parse; nothing stamped"

# The atlas and the credits are generated, and a release with a stale one ships
# art whose licence data does not describe it — which is the one thing
# art/CREDITS.md exists to prevent.
if [ -d tools/node_modules ]; then
  say "release: checking the sprite atlas is current..."
  node tools/build-sprites.mjs --check >/dev/null 2>&1 \
    || die "the sprite atlas or CREDITS.md is stale — run: node tools/build-sprites.mjs"
else
  say "release: skipping the atlas check (tools/node_modules missing — run: cd tools && npm install)"
fi

# Every file the pages actually ask for should be here, because a 404 on a
# script is a game that boots to a black screen.
say "release: checking every referenced file exists..."
MISSING=0
for page in index.html editor.html; do
  [ -e "$page" ] || continue
  # shellcheck disable=SC2013
  for ref in $(sed -n 's/.*\(src\|href\)="\([^"?:]*\)?\?v=[^"]*".*/\2/p' "$page"); do
    [ -e "$ref" ] || { say "  $page references a missing file: $ref"; MISSING=1; }
  done
done
[ "$MISSING" -eq 0 ] || die "a page references a file that is not here; nothing stamped"

if [ "$MODE" = "--check" ]; then
  say "release: checks passed. Nothing stamped (--check)."
  [ "$OLD" = "$VER" ] && say "release: the stamp is already $VER." || say "release: the stamp WOULD move ${OLD:-(none)} -> $VER."
  exit 0
fi

# ---- the stamp -------------------------------------------------------------
if [ "$OLD" = "$VER" ]; then
  say "release: already stamped $VER — nothing to do."
  exit 0
fi
for page in index.html editor.html; do
  [ -e "$page" ] || continue
  # Every ?v= on the page, whatever it currently says. One string for the whole
  # release on purpose: a per-file hash would let a browser hold a mixed set,
  # and a mixed set is the failure this is here to prevent.
  perl -pi -e "s/\?v=[0-9a-zA-Z]+/?v=$VER/g" "$page"
  say "release: stamped $page -> ?v=$VER"
done

git add index.html editor.html
if [ "$MODE" = "--commit" ]; then
  git commit -q -m "Release $VER" -- index.html editor.html
  say "release: committed."
else
  say "release: staged. Commit it, then push — the stamp has to be IN the release."
fi
say "release: done. Pages will rebuild from the default branch; give it a minute or two."
