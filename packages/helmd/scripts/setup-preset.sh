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
# The desktop Electron also sees the asar-vendored host (newer builds, e.g.
# DSH NEXT 2.0.19+): even when system node exists, if gen-preset fails to find
# the host under node, retry once through the Electron binary.
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
fi

# Probe a desktop Electron for later fallback (also when system node exists).
[ -z "$DSH_ELECTRON" ] && for cand in \
  "/Applications/DSH NEXT.app/Contents/MacOS/DSH NEXT" \
  "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" \
  "$HOME/Applications/DSH NEXT.app/Contents/MacOS/DSH NEXT"; do
  if [ -x "$cand" ]; then DSH_ELECTRON="$cand"; break; fi
done
# DSH_DESKTOP_APP_DIR steers gen-preset's host discovery at the app's vendored
# node_modules when npm globals / PATH hold no dsh install. Newer desktop
# builds ship the host inside app.asar — only the Electron binary can read
# those paths, so the env is a hint, not a hard requirement.
if [ -n "$DSH_ELECTRON" ]; then
  RESOURCES_DIR="$(dirname "$(dirname "$DSH_ELECTRON")")/Resources"
  if [ -z "${DSH_DESKTOP_APP_DIR:-}" ]; then
    if [ -f "$RESOURCES_DIR/app.asar" ]; then
      export DSH_DESKTOP_APP_DIR="$RESOURCES_DIR/app.asar/node_modules"
    else
      export DSH_DESKTOP_APP_DIR="$RESOURCES_DIR/app/node_modules"
    fi
  fi
fi
[ -f "$GEN_SCRIPT" ] || { echo "generator not found at $GEN_SCRIPT (run from inside the installed package)"; exit 1; }

[ -f "$TARGET" ] && { cp "$TARGET" "$TARGET.bak"; echo "  kept $TARGET.bak"; }

# gen-preset asserts the artifact's shape and writes nothing when the host
# predates 0.1.7 or the assertion fails, so a non-zero exit leaves the current
# patch untouched.
if [ -n "$NODE_BIN" ]; then
  if "$NODE_BIN" "$GEN_SCRIPT" --out "$TARGET"; then
    :
  elif [ -n "$DSH_ELECTRON" ]; then
    echo "  (system node found no host standard; retrying through the desktop Electron — asar-vendored host)"
    if ! ELECTRON_RUN_AS_NODE=1 "$DSH_ELECTRON" "$GEN_SCRIPT" --out "$TARGET"; then
      echo "gen-preset failed; $TARGET was left as-is"
      exit 1
    fi
  else
    echo "gen-preset failed; $TARGET was left as-is"
    exit 1
  fi
else
  if ! ELECTRON_RUN_AS_NODE=1 "$DSH_ELECTRON" "$GEN_SCRIPT" --out "$TARGET"; then
    echo "gen-preset failed; $TARGET was left as-is"
    exit 1
  fi
fi

echo "[done] preset patch re-derived from the installed dsh standard"
echo "[next] restart dsh, then assert the first request's tool catalog (MAINTENANCE section 8)"
