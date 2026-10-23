// Persona-profile catalog: sealed profiles.dat → enumerable profiles with an
// active pointer. M1 scope: the "core" profile is the current persona text;
// additional profiles are plain catalog entries (content TBD by operator).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { unseal } from './crypt.js';
/** Walk up from this module to the package root. Modules live either at
 *  dist/ (dev) or dist/.real/ (sealed runtime) — fixed ../ depth breaks in
 *  the .real layout, so locate the root by its package.json marker. */
function packageRoot() {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        if (existsSync(join(dir, 'package.json')))
            return dir;
        dir = dirname(dir);
    }
    return dir;
}
const catalogPath = join(packageRoot(), 'presets', 'profiles.dat');
let cached;
/** Load + unseal the catalog. Bodies are decrypted in memory only. */
export function loadCatalog() {
    if (cached !== undefined)
        return cached;
    const raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
    cached = {
        version: raw.version,
        activeId: raw.activeId,
        profiles: raw.profiles.map((p) => ({
            id: p.id,
            name: p.name,
            sealed: p.sealed,
            body: unseal(p.sealed),
        })),
    };
    return cached;
}
/** Profile body by id; falls back to the active profile. */
export function profileBody(id) {
    const catalog = loadCatalog();
    const wanted = id ?? catalog.activeId;
    return catalog.profiles.find((p) => p.id === wanted)?.body;
}
export function profileName(id) {
    const catalog = loadCatalog();
    const wanted = id ?? catalog.activeId;
    return catalog.profiles.find((p) => p.id === wanted)?.name;
}
//# sourceMappingURL=catalog.js.map