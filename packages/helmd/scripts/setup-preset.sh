#!/usr/bin/env bash
# scripts/setup-preset.sh -- re-derive this package's preset patch against the
# dsh host installed on THIS machine.
#
# dsh >= 0.1.7 changed the model: a preset is one composition row
# (@deepseek-ai/dsh-agent-preset) that the bundle declares through
# dsh.bundle.patch, so there is no `.agent-presets/<name>/` deployment left and
# nothing to copy. The artifact lives inside the package
# (preset.generated.patch.yml); this script only regenerates it from the local
# host's own standard preset, which is what a host upgrade requires.
#
# Usage: ./scripts/setup-preset.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/../preset.generated.patch.yml"
GEN_SCRIPT="$SCRIPT_DIR/gen-preset.mjs"

# Node runtime resolution: prefer the system node; on a desktop-only install
# (DSH NEXT / DSH Desktop ship no system node requirement) fall back to the
# app's Electron binary in RunAsNode mode — the desktop build enables the fuse.
NODE_BIN=""
DSH_ELECTRON=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
else
  for cand in \
    "/Applications/DSH NEXT.app/Contents/MacOS/DSH NEXT" \
    "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" \
    "$HOME/Applications/DSH NEXT.app/Contents/MacOS/DSH NEXT"; do
    if [ -x "$cand" ]; then DSH_ELECTRON="$cand"; break; fi
  done
  if [ -z "$DSH_ELECTRON" ]; then
    echo "node is required to regenerate the preset patch (gen-preset.mjs reads the installed dsh standard);"
    echo "no system node and no DSH Desktop app found — install node or DSH Desktop, or set DSH_DESKTOP_APP_DIR"
    exit 1
  fi
  echo "  using desktop Electron as node: $DSH_ELECTRON"
  # DSH_DESKTOP_APP_DIR steers gen-preset's host discovery at the app's own
  # unpacked node_modules when npm globals / PATH hold no dsh install.
  export DSH_DESKTOP_APP_DIR="${DSH_DESKTOP_APP_DIR:-$(dirname "$(dirname "$DSH_ELECTRON")")/Resources/app/node_modules}"
fi
[ -f "$GEN_SCRIPT" ] || { echo "generator not found at $GEN_SCRIPT (run from inside the installed package)"; exit 1; }

[ -f "$TARGET" ] && { cp "$TARGET" "$TARGET.bak"; echo "  kept $TARGET.bak"; }

# gen-preset asserts the artifact's shape and writes nothing when the host
# predates 0.1.7 or the assertion fails, so a non-zero exit leaves the current
# patch untouched.
if [ -n "$DSH_ELECTRON" ]; then
  if ! ELECTRON_RUN_AS_NODE=1 "$DSH_ELECTRON" "$GEN_SCRIPT" --out "$TARGET"; then
    echo "gen-preset failed; $TARGET was left as-is"
    exit 1
  fi
else
  if ! "$NODE_BIN" "$GEN_SCRIPT" --out "$TARGET"; then
    echo "gen-preset failed; $TARGET was left as-is"
    exit 1
  fi
fi

echo "[done] preset patch re-derived from the installed dsh standard"
echo "[next] restart dsh, then assert the first request's tool catalog (MAINTENANCE section 8)"
