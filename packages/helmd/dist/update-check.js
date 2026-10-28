// Update check: compare the installed package version with the latest GitHub
// release (fallback: npm registry). Uses the proxy-aware transport from
// net-fetch.ts because native fetch ignores proxy settings.
//
// (fork: REPO points at Fleey/helm-deepseek-harnessn — checking against the
// upstream would forever advertise ADWMC releases this fork intentionally
// diverges from. The npm fallback stays on the upstream package name: the
// fork is not published to npm, and "upstream has a new version" is still
// useful signal there.)
import { readFileSync } from 'node:fs';
import { requestText } from './net-fetch.js';
const REPO = 'Fleey/helm-deepseek-harnessn';
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const CHANGELOG_URL = `https://github.com/${REPO}/blob/main/CHANGELOG.md`;
/** Strip a leading `v`/`V` and surrounding whitespace. */
export function normalizeVersion(value) {
    return typeof value === 'string' ? value.trim().replace(/^v/i, '') : '';
}
/** Any version difference counts as an update candidate; the UI shows both
 *  versions instead of claiming semver ordering. */
export function versionDiffers(current, latest) {
    const a = normalizeVersion(current);
    const b = normalizeVersion(latest);
    return a !== '' && b !== '' && a !== b;
}
/** Real release notes for the About tab: prefer bullet lines, otherwise the
 *  first non-heading lines. Markdown emphasis is stripped for plain text. */
export function parseReleaseNotes(body) {
    if (typeof body !== 'string')
        return [];
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const bullets = lines
        .filter((line) => /^[-*]\s+/.test(line))
        .map((line) => line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').slice(0, 180));
    const source = bullets.length > 0 ? bullets : lines.filter((line) => !line.startsWith('#')).map((line) => line.slice(0, 180));
    return source.slice(0, 6);
}
function installedVersion() {
    try {
        const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        return normalizeVersion(pkg.version) || 'unknown';
    }
    catch {
        return 'unknown';
    }
}
async function latestFromGithub() {
    const response = await requestText(`https://api.github.com/repos/${REPO}/releases/latest`, {
        method: 'GET',
        headers: { accept: 'application/vnd.github+json' },
    });
    if (response.status !== 200)
        throw new Error(`GitHub HTTP ${String(response.status)}`);
    const data = JSON.parse(response.text);
    const version = normalizeVersion(data.tag_name);
    if (version === '')
        throw new Error('GitHub release carries no tag_name');
    return {
        version,
        url: typeof data.html_url === 'string' ? data.html_url : RELEASES_URL,
        notes: parseReleaseNotes(data.body),
    };
}
async function latestFromNpm() {
    const response = await requestText('https://registry.npmjs.org/@adwmc/helm-d/latest', {
        method: 'GET',
        headers: { accept: 'application/json' },
    });
    if (response.status !== 200)
        throw new Error(`npm HTTP ${String(response.status)}`);
    const data = JSON.parse(response.text);
    const version = normalizeVersion(data.version);
    if (version === '')
        throw new Error('npm registry carries no version');
    return version;
}
/** Check GitHub first, then npm. Network failures are reported in `error`
 *  instead of throwing so the panel can render them. */
export async function checkForUpdate() {
    const current = installedVersion();
    const base = {
        currentVersion: current,
        latestVersion: null,
        updateAvailable: false,
        releaseUrl: RELEASES_URL,
        changelogUrl: CHANGELOG_URL,
        releaseNotes: [],
        checkedAt: new Date().toISOString(),
        source: null,
    };
    try {
        const latest = await latestFromGithub();
        return {
            ...base,
            latestVersion: latest.version,
            updateAvailable: versionDiffers(current, latest.version),
            releaseUrl: latest.url,
            releaseNotes: latest.notes,
            source: 'github',
        };
    }
    catch (githubError) {
        try {
            const latest = await latestFromNpm();
            return {
                ...base,
                latestVersion: latest,
                updateAvailable: versionDiffers(current, latest),
                source: 'npm',
            };
        }
        catch (npmError) {
            return {
                ...base,
                error: `${githubError.message}; npm: ${npmError.message}`,
            };
        }
    }
}
//# sourceMappingURL=update-check.js.map