#!/usr/bin/env node
// scripts/sync-root-seal.mjs — sync sealed artifacts to the repo root (maintainer tool).
//
// The fork repo is a pnpm monorepo, but profile installs use
// `github:Fleey/helm-deepseek-harnessn`, and the host that runs those installs
// has NO package manager on PATH (only node), so a `prepare` lifecycle hook
// can never work there (pnpm's git-fetcher injects `<pm> install` first and
// dies with spawn ENOENT). Instead, the root of the repo IS the installable
// package: this script copies the sealed artifacts from packages/helmd to the
// root, the maintainer commits them, and a git install is a plain file copy
// with zero build steps. Run it as part of every release (after build-sealed):
//
//   node scripts/sync-root-seal.mjs
//
//   client.js                     (root shim — already at the root)
//   payload.dat / references.dat  (sealed blobs; stubs resolve pkgRoot =
//                                  dirname(dirname(dist/health.js)) = repo root)
//   presets/preset.yml + profiles.dat
//   cordis.patch.yml / preset.generated.patch.yml (root copies already exist;
//                                  refreshed from the subpackage when present)
//   dist/health.js|index.js       (sealed entry stubs)
//
// No build step: every copied file is committed to the repo by scripts/repack
// (build-sealed writes them into packages/helmd before commit). Zero deps —
// the host's install-time node runs this with no node_modules.
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = join(root, 'packages', 'helmd')

function copy(rel) {
	const src = join(pkg, rel)
	if (!existsSync(src)) {
		console.warn(`[sync-root-seal] skip missing ${rel}`)
		return
	}
	const dest = join(root, rel)
	mkdirSync(dirname(dest), { recursive: true })
	copyFileSync(src, dest)
	console.log(`[sync-root-seal] ${rel}`)
}

// Stale extraction cache from a previous load must not shadow the fresh copy.
rmSync(join(root, 'packages', 'helmd', '.real'), { recursive: true, force: true })

copy('payload.dat')
copy('references.dat')
copy('presets/preset.yml')
copy('presets/profiles.dat')
copy('preset.generated.patch.yml')
copy('dist/health.js')
copy('dist/health.d.ts')
copy('dist/index.js')
copy('dist/index.d.ts')

console.log('[sync-root-seal] done')
