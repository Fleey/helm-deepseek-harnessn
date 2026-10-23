/** Sealed reference content by repo-relative path, or undefined when the
 *  bundle is absent (repo dev mode) or the path is not in the bundle. */
export declare function readSealedReference(relPath: string): string | undefined;
/** Sealed content by absolute path: any path containing a `references`
 *  segment maps to its bundle key (references/<rest>). Used by readTextSeam
 *  so every domain tool's plaintext reference read transparently falls back
 *  to the encrypted bundle when the plaintext file is absent. */
export declare function readSealedByAbsPath(absPath: string): string | undefined;
