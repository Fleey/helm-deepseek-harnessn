#!/usr/bin/env node
// scripts/prepare-github-install.mjs — make a git install of this repo loadable.
//
// The fork repo is a pnpm monorepo, but the sealable deliverable is the
// packages/helmd subpackage. npm/pnpm run `prepare` after checking out a
// `github:` dependency, so this script copies the committed sealed artifacts
// from packages/helmd to the repo root, where the root package.json's
// `main`/`exports` and the sealed stubs expect them:
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
		console.warn(`[prepare-github-install] skip missing ${rel}`)
		return
	}
	const dest = join(root, rel)
	mkdirSync(dirname(dest), { recursive: true })
	copyFileSync(src, dest)
	console.log(`[prepare-github-install] ${rel}`)
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

console.log('[prepare-github-install] done')
