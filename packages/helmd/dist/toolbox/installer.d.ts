import { type ToolCatalogEntry } from './catalog.js';
import { type InstalledTool } from './registry.js';
export interface ReleaseAsset {
    name: string;
    size: number;
    digest: string | null;
    url: string;
}
export interface ReleaseInfo {
    tag: string;
    assets: ReleaseAsset[];
}
/** Latest release + its assets (digest is the GitHub-published sha256 when present). */
export declare function latestRelease(entry: ToolCatalogEntry): Promise<ReleaseInfo>;
/** Pick one installable asset: explicit name, a catalog asset pattern, or the
 *  only digest-pinned archive when there is exactly one. Ambiguity is an
 *  error, never a guess. */
export declare function chooseAsset(assets: ReleaseAsset[], requested?: string, pattern?: string): ReleaseAsset;
/** Install one catalog release. Returns the installed registry row. */
export declare function installCatalogTool(id: string, assetName?: string): Promise<InstalledTool>;
/** Update one installed catalog tool to its latest release. The old registry
 *  row is restored if the download/extract fails; the old directory is removed
 *  only after the new install is in place. */
export declare function updateCatalogTool(id: string, assetName?: string): Promise<InstalledTool>;
/** Install a local archive (offline mirror). The digest is mandatory and is
 *  supplied by the operator; this never downloads anything. */
export declare function installCatalogMirror(id: string, archivePath: string, sha256: string): Promise<InstalledTool>;
/** Remove one installed catalog tool. Refuses paths outside the tool root. */
export declare function uninstallCatalogTool(id: string): InstalledTool;
/** Read-only health: installed, directory present, size of the install dir. */
export declare function toolHealth(id: string): {
    installed: boolean;
    version?: string;
    path?: string;
    present?: boolean;
};
