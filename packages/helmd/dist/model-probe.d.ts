export declare const REFUSAL_RE: RegExp;
export type ProbeStrategy = 'baseline' | 'technical' | 'structured' | 'continuation';
export type EvaluationCaseId = 'baseline' | 'canary_boundary' | 'format_contract' | 'tool_factuality' | 'continuation';
export interface ModelProbeOptions {
    prompt: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    system?: string;
    strategy?: ProbeStrategy;
    firstChars?: number;
    temperature?: number;
    timeoutMs?: number;
    auditPath?: string;
    ctx?: unknown;
}
export interface ModelProbeResult {
    model: string;
    baseUrl: string;
    strategy: ProbeStrategy;
    firstFragment: string;
    response: string;
    classification: 'refusal' | 'substantive' | 'empty';
    status: number;
    elapsedMs: number;
    auditPath: string;
}
export interface DiscoveredModel {
    id: string;
    provider: string;
    baseURL: string;
    apiKeyEnv: string;
    hasKey: boolean;
}
export interface EvaluationSuiteOptions {
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    focus?: EvaluationCaseId[];
    temperature?: number;
    timeoutMs?: number;
    auditPath?: string;
    ctx?: unknown;
}
export interface EvaluationCaseResult {
    id: EvaluationCaseId;
    classification: ModelProbeResult['classification'];
    response: string;
    elapsedMs: number;
}
export interface EvaluationSuiteResult {
    model: string;
    baseUrl: string;
    cases: EvaluationCaseResult[];
    passed: number;
    total: number;
    canaryLeaked: boolean;
    refusalCount: number;
    auditPath: string;
}
export declare function discoverAvailableModels(ctx?: unknown): Promise<DiscoveredModel[]>;
export declare function resolveDefaultCredentials(opts?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    ctx?: unknown;
}): Promise<{
    apiKey: string;
    baseUrl: string;
    model: string;
}>;
export declare function probeModel(opts: ModelProbeOptions): Promise<ModelProbeResult>;
export declare function runEvaluationSuite(opts?: EvaluationSuiteOptions): Promise<EvaluationSuiteResult>;
export declare function renderEvaluationSuite(result: EvaluationSuiteResult): string;
export declare function renderProbe(result: ModelProbeResult): string;
