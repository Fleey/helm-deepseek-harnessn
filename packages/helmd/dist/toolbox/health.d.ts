export interface ProbeResult {
    command: string;
    status: 'verified' | 'missing';
    path?: string;
    at: string;
}
export declare function probeCommand(command: string): ProbeResult;
export declare function clearProbeCache(): void;
