export interface RawResponse {
    status: number;
    text: string;
}
export interface RawBufferResponse {
    status: number;
    buffer: Buffer;
}
export declare function requestText(url: string, init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
}): Promise<RawResponse>;
/** Proxy-aware binary fetch; requestText is the UTF-8 view of this. Follows a
 *  bounded redirect chain (GitHub release downloads 302 to a signed asset URL)
 *  and never forwards Authorization across hosts. */
export declare function requestBuffer(url: string, init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
}, hops?: number): Promise<RawBufferResponse>;
