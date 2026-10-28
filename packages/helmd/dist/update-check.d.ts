export interface UpdateStatus {
    currentVersion: string;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string;
    changelogUrl: string;
    /** Bullet excerpts from the GitHub release body; empty when only npm answered. */
    releaseNotes: string[];
    checkedAt: string;
    source: 'github' | 'npm' | null;
    error?: string;
}
/** Strip a leading `v`/`V` and surrounding whitespace. */
export declare function normalizeVersion(value: unknown): string;
/** Any version difference counts as an update candidate; the UI shows both
 *  versions instead of claiming semver ordering. */
export declare function versionDiffers(current: string, latest: string): boolean;
/** Real release notes for the About tab: prefer bullet lines, otherwise the
 *  first non-heading lines. Markdown emphasis is stripped for plain text. */
export declare function parseReleaseNotes(body: unknown): string[];
/** Check GitHub first, then npm. Network failures are reported in `error`
 *  instead of throwing so the panel can render them. */
export declare function checkForUpdate(): Promise<UpdateStatus>;
