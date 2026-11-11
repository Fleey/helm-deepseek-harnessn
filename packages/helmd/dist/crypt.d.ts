/** Seal plaintext → "iv.tag.ciphertext" (base64url parts, dot-joined). */
export declare function seal(plain: string): string;
/** Unseal a value produced by {@link seal}. Throws on tamper. */
export declare function unseal(sealed: string): string;
