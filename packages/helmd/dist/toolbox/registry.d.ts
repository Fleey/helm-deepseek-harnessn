export interface InstalledTool {
    id: string;
    name: string;
    repo: string;
    version: string;
    path: string;
    assetName: string;
    sha256: string;
    installedAt: string;
}
export interface ToolRegistry {
    tools: Record<string, InstalledTool>;
}
export declare function toolboxRoot(): string;
export declare function registryPath(): string;
export declare function loadRegistry(): ToolRegistry;
export declare function installedTool(id: string): InstalledTool | undefined;
export declare function listInstalled(): InstalledTool[];
export declare function upsertInstalled(tool: InstalledTool): void;
export declare function removeInstalled(id: string): InstalledTool | undefined;
export declare function toolDir(id: string, version: string): string;
