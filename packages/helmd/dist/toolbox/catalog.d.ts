export type ToolKind = 'release' | 'pip' | 'manual';
export interface ToolCatalogEntry {
    id: string;
    name: string;
    /** Verified GitHub repository (https://github.com/<owner>/<repo>). */
    repo: string;
    category: string;
    purpose: string;
    /** Upstream license, recorded for operator review before download. */
    license?: string;
    kind: ToolKind;
    /** pip package name for kind=pip. */
    package?: string;
    /** Install/build hint shown for pip/manual entries. */
    installHint?: string;
    /** Verified invocation template shown to the model after install. */
    usage: string;
    /** Pin a specific release tag (needed when latest belongs to another project). */
    tag?: string;
    /** Pin an exact release asset name (raw binaries without extensions). */
    asset?: string;
    /** Version-agnostic asset matcher; must resolve to exactly one digest-pinned asset. */
    assetPattern?: string;
}
export declare const TOOL_CATALOG: ToolCatalogEntry[];
export declare function catalogEntry(id: string): ToolCatalogEntry | undefined;
/** Only https://github.com/<owner>/<repo> is accepted; every catalog entry
 *  must pass this (checked by the toolbox-catalog check). */
export declare function isGithubRepo(url: string): boolean;
