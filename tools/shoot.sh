#!/bin/sh
# Usage: tools/shoot.sh <name> <url> <width> <height>  → scratch screenshot via headless Chrome
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${SHOT_DIR:-/private/tmp/claude-501/-Users-nedbet/3b0b7874-a2f9-473d-87f4-190bbaa4ba03/scratchpad/shots}"
mkdir -p "$OUT"
"$CH" --headless=new --disable-gpu --no-first-run --no-default-browser-check --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 --screenshot="$OUT/$1.png" --window-size="$3,$4" "$2" >/dev/null 2>&1
echo "$OUT/$1.png"
