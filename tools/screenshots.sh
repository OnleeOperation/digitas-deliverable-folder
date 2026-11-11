#!/usr/bin/env bash
# Backup screenshots for every demo screen (Build Brief section 14).
# Usage: tools/screenshots.sh [scenario-id]   (default: elena-retention; also elena-performance, elena-launch)
# Needs Google Chrome. Writes PNGs to screenshots/<scenario>/.
set -euo pipefail
cd "$(dirname "$0")/.."
SCEN="${1:-elena-retention}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="screenshots/$SCEN"; mkdir -p "$OUT"
PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/dcshot.XXXXXX")"
BASE="file://$PWD/index.html"
shot() { # name route height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
    --window-size=1440,"$3" --virtual-time-budget=3000 \
    --screenshot="$OUT/$1.png" "$BASE#/$2?s=$SCEN" >/dev/null 2>&1 && echo "wrote $OUT/$1.png"
}
shot connect-1-start      connect/1 1000
shot connect-2-star       connect/2 1000
shot connect-3-proof      connect/3 1000
shot connect-4-compare    connect/4 1500
shot connect-5-next-step  connect/5 1000
shot studio-a-start       studio/a  1000
shot studio-b-match       studio/b  1700
shot studio-c-agreement   studio/c  1200
shot studio-d-log         studio/d  1000
shot one-database         database  900
shot business-case        business-case 1500
rm -rf "$PROFILE"
