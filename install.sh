#!/usr/bin/env bash
# One-command deploy for helmd: download the latest release tarball, write the
# preset inline, and set it as the default agent preset.
set -euo pipefail

PROFILE="${1:-web}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
ACTIVATION="helmd"
REPO="${HELMD_REPO:-ADWMC/helm-d}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
CACHE_DIR="$DSH_HOME/.tgz-cache"
mkdir -p "$CACHE_DIR"

# ── dsh Desktop (DSH NEXT / DSH Desktop) branch ────────────────────────────
# The `desktop` profile is managed exclusively by the Electron application:
# every CLI (npm-installed or app-bundled) refuses it with
#   error: profile "desktop" is managed exclusively by the Electron application
# so there is no `dsh plugin --profile desktop add` channel. Installation goes
# through the in-app plugin manager (same pnpm + bundles reconciliation the web
# profile uses); this script verifies the profile, hands over install
# instructions, and re-derives the preset patch once the package is present.
run_gen_preset() { # $1 = gen-preset.mjs path, $2 = target patch path
  local gen="$1" target="$2"
  if command -v node >/dev/null 2>&1; then
    node "$gen" --out "$target"
  else
    local electron=""
    for cand in \
      "/Applications/DSH NEXT.app/Contents/MacOS/DSH NEXT" \
      "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop"; do
      [ -x "$cand" ] && { electron="$cand"; break; }
    done
    [ -n "$electron" ] || return 1
    DSH_DESKTOP_APP_DIR="${DSH_DESKTOP_APP_DIR:-$(dirname "$(dirname "$electron")")/Resources/app/node_modules}" \
      ELECTRON_RUN_AS_NODE=1 "$electron" "$gen" --out "$target"
  fi
}

if [ "$PROFILE" = "desktop" ]; then
  PROFILE_DIR="$DSH_HOME/profiles/desktop"
  [ -d "$PROFILE_DIR" ] || {
    echo "desktop profile not found at $PROFILE_DIR."
    echo "Start DSH NEXT (or DSH Desktop) once so it initializes the desktop profile, then re-run: $0 desktop"
    exit 1
  }
  BUNDLE_ROOT="$PROFILE_DIR/node_modules/@adwmc/helm-d"
  if [ ! -d "$BUNDLE_ROOT" ]; then
    echo "[desktop] package not installed yet. Install it from the app:"
    echo "  DSH NEXT -> Settings/设置 -> Plugins/插件 -> Add/添加, then pick ONE:"
    echo "    1) npm package name:  @adwmc/helm-d"
    echo "    2) tarball URL:       https://github.com/$REPO/releases/download/vX.Y.Z/helmd.tgz (versioned; not latest/download)"
    echo "    3) github:            github:ADWMC/helm-d/tree/main/packages/helmd"
    echo "After the app finishes installing, re-run: $0 desktop"
    echo "(this re-derives the preset patch from the app's own dsh standard)"
    exit 0
  fi
  PATCH_TARGET="$BUNDLE_ROOT/preset.generated.patch.yml"
  GEN_SCRIPT="$BUNDLE_ROOT/scripts/gen-preset.mjs"
  echo "[desktop] @adwmc/helm-d found in the desktop profile; re-deriving the preset patch ..."
  [ -f "$PATCH_TARGET" ] && { cp "$PATCH_TARGET" "$PATCH_TARGET.bak"; echo "  kept $PATCH_TARGET.bak"; }
  if [ ! -f "$GEN_SCRIPT" ]; then
    # 0.5.x sealed distribution ships no in-package generator (zero plaintext);
    # keep the shipped patch and let the in-app health card report the verdict.
    echo "  (sealed distribution: no in-package generator; keeping the shipped patch)"
    echo "  check the health card in Settings → Plugins after restart"
  elif run_gen_preset "$GEN_SCRIPT" "$PATCH_TARGET"; then
    echo "  preset patch re-derived from the desktop host standard (platform rows match this app)"
  else
    echo "  (generator failed; keeping the shipped patch — the in-app health card will auto-heal on restart)"
  fi
  echo "[desktop] done. Quit DSH NEXT completely and reopen it, pick the 'helmd' preset,"
  echo "then send the activation word: $ACTIVATION"
  exit 0
fi

echo "[1/4] downloading release tarball from $REPO ..."
# Versioned URL (upstream issue #5): a rolling latest/download address baked
# into a profile dependency breaks the pnpm lockfile sha512 on the next
# release (ERR_PNPM_TARBALL_INTEGRITY). HELMD_VERSION pins the exact tag;
# the tag list is fetched once when it is unset.
AUTH=()
[ -n "${GH_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $GH_TOKEN")
if [ -z "${GH_TOKEN:-}" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

TGZ_NAME="helmd.tgz"
if [ -z "${HELMD_VERSION:-}" ]; then
  echo "  resolving latest release tag (override with HELMD_VERSION=vX.Y.Z) ..."
  HELMD_VERSION=$(curl -fsSL "${AUTH[@]}" -H "accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
fi
if [ -z "${HELMD_VERSION:-}" ]; then
  echo "  could not resolve the latest tag; set HELMD_VERSION=vX.Y.Z and retry" >&2
  exit 1
fi
URL="https://github.com/$REPO/releases/download/$HELMD_VERSION/$TGZ_NAME"
echo "  fetching $TGZ_NAME from $REPO ($HELMD_VERSION)"
curl -fsSL "${AUTH[@]}" -L -o "$CACHE_DIR/$TGZ_NAME" "$URL"

echo "[2/4] installing helmd from local tarball ..."
PROFILE_PKG="$DSH_HOME/profiles/$PROFILE/package.json"
if [ -f "$PROFILE_PKG" ]; then
  echo "  stripping stale deps from existing profile"
  node -e '
const fs=require("fs");
const p=process.argv[1];
const pkg=JSON.parse(fs.readFileSync(p,"utf8"));
const stale=new Set(["dsh-find-plugin","@deepseek-ai/dsh-plugin-console"]);
const isStale=(n)=>stale.has(n)||n.startsWith("@linxin666/")||(n.startsWith("@dsh-security/")&&n!=="@adwmc/helm-d");
let changed=false;
for(const f of ["dependencies","devDependencies","optionalDependencies"]){if(pkg[f]&&typeof pkg[f]==="object"){for(const k of Object.keys(pkg[f])){if(isStale(k)){delete pkg[f][k];changed=true;}}}}
if(changed)fs.writeFileSync(p,JSON.stringify(pkg,null,2)+"\n");
' "$PROFILE_PKG"
fi

TGZ_FILE="$CACHE_DIR/$TGZ_NAME"
if command -v dsh >/dev/null 2>&1; then
  dsh plugin --profile "$PROFILE" add "$TGZ_FILE"
else
  npx --yes @deepseek-ai/dsh plugin --profile "$PROFILE" add "$TGZ_FILE"
fi

# uninstall legacy sibling bundles left in node_modules (incl. pnpm tmp dirs)
SEC_DIR="$DSH_HOME/profiles/$PROFILE/node_modules/@dsh-security"
if [ -d "$SEC_DIR" ]; then
  for d in "$SEC_DIR"/*/; do
    b=$(basename "$d")
    rm -rf "$d"; echo "  uninstalled legacy bundle: $b"
  done
fi

echo "[3/4] deriving the preset patch against this machine's dsh host ..."
BUNDLE_ROOT="$DSH_HOME/profiles/$PROFILE/node_modules/@adwmc/helm-d"
PATCH_TARGET="$BUNDLE_ROOT/preset.generated.patch.yml"
if [ ! -f "$PATCH_TARGET" ]; then
  echo "bundled preset patch not found at $PATCH_TARGET"; exit 1
fi

# 0.5.x sealed distribution: the tarball ships payload.dat / references.dat and
# NO plaintext persona.txt or scripts/gen-preset.mjs (npm supply-chain scan sees
# zero plaintext), so in-place re-derivation is impossible by design — keep the
# shipped patch; the in-app health card (Settings → Plugins) reports the preset
# verdict after restart, and HOST_UPGRADED means re-install for this host
# generation. Older plaintext bundles (0.4.x) still carry the generator.
GEN_SCRIPT="$BUNDLE_ROOT/scripts/gen-preset.mjs"
if [ ! -f "$GEN_SCRIPT" ]; then
  echo "  (sealed distribution: no in-package generator; keeping the shipped patch)"
  echo "  check the health card in Settings → Plugins after restart"
elif command -v node >/dev/null 2>&1; then
  if node "$GEN_SCRIPT" --out "$PATCH_TARGET"; then
    echo "  preset patch re-derived from local dsh standard (platform rows match this host)"
  else
    echo "  (generator failed; keeping the shipped patch - run scripts/setup-preset.sh after upgrading dsh)"
  fi
else
  echo "  (node unavailable; keeping the shipped patch - run scripts/setup-preset.sh once node is on PATH)"
fi

echo "[4/4] preset ready: id 'helmd' (default NOT auto-set; pick 'helmd' in the UI preset picker)"
echo
# dsh >= 0.1.7 serves plain http on loopback, and an unauthenticated request
# answers 401 — which still proves something is listening, so no -f here.
if curl -sS --max-time 3 -o /dev/null "http://127.0.0.1:3080/" 2>/dev/null; then
  echo "NOTE: dsh looks running locally — restart it so it re-reads the preset patch"
  echo "from this package (see docs/incident-2026-08-26-preset-stale-generation.md)."
  echo
fi
echo "done. run: dsh $PROFILE   (or: npx --yes @deepseek-ai/dsh $PROFILE)"
echo "then send the activation word: $ACTIVATION"
