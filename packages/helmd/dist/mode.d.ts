export type Level = 'lite' | 'full' | 'deep';
export declare const LEVELS: Level[];
export declare const DEFAULT_LEVEL: Level;
export declare function getLevel(sessionId?: string): Level;
export declare function setLevel(level: Level, sessionId?: string): void;
export declare function normalizeLevel(v: unknown): Level | null;
export declare function renderContract(level: Level): string;
