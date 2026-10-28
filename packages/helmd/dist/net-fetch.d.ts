export interface RawResponse {
    status: number;
    text: string;
}
export declare function requestText(url: string, init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
}): Promise<RawResponse>;
