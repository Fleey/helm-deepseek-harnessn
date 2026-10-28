export interface Profile {
    id: string;
    name: string;
    /** Sealed body — unseal() at load; plaintext lives only in memory. */
    sealed: string;
    body?: string;
}
export interface Catalog {
    version: number;
    activeId: string;
    profiles: Profile[];
    /** Sealed tail override block (presets/boost.txt), unsealed in memory. */
    boost?: string;
}
/** Load + unseal the catalog. Bodies are decrypted in memory only. */
export declare function loadCatalog(): Catalog;
/** Tail override block (sealed boost.txt). Undefined when the build has none. */
export declare function boostBody(): string | undefined;
/** Profile body by id; falls back to the active profile. */
export declare function profileBody(id?: string): string | undefined;
