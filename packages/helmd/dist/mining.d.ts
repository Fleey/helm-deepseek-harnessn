export interface Candidate {
    class: string;
    target: string;
    endpoint: string;
    param?: string;
    source: string;
    confidence: number;
}
export declare function dedupeCandidates(candidates: Candidate[]): Candidate[];
/** HAR 1.2: every request URL, with query parameters preserved. */
export declare function extractHar(text: string, target: string): Candidate[];
/** OpenAPI 3 / Swagger 2 paths + parameters. */
export declare function extractOpenApi(text: string, target: string): Candidate[];
/** JS/HTML text: absolute URLs and quoted API paths. No evaluation. */
export declare function extractText(text: string, target: string): Candidate[];
/** Minimal Android binary XML string-pool reader. It does not need the full
 *  resource map: package/activity/permission/URL strings are enough to mine
 *  candidates from a compiled AndroidManifest.xml. */
export declare function decodeAxmlStrings(buffer: Buffer): string[];
/** Read one entry from an APK/zip without extracting the whole archive. */
export declare function readApkEntry(apkPath: string, entry?: string): Buffer | undefined;
/** Manifest string candidates for an APK: URLs, API paths and package-ish
 *  component names from the binary string pool. */
export declare function extractApk(text: string, target: string, apkPath?: string): Candidate[];
export declare function extractCandidates(text: string, target: string, format: 'har' | 'openapi' | 'text' | 'apk', apkPath?: string): Candidate[];
export declare function candidatesPath(caseDir: string): string;
export declare function writeCandidates(caseDir: string, candidates: Candidate[]): void;
export declare function loadCandidates(caseDir: string): Candidate[];
export declare function miningLine(caseDir: string, assetCount: number): string;
