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
}
/** Load + unseal the catalog. Bodies are decrypted in memory only. */
export declare function loadCatalog(): Catalog;
/** Profile body by id; falls back to the active profile. */
export declare function profileBody(id?: string): string | undefined;
export declare function profileName(id?: string): string | undefined;
