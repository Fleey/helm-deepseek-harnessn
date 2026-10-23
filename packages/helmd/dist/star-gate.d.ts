export interface DeviceSession {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresAt: number;
    intervalMs: number;
}
export interface GateState {
    starred: boolean;
    checkedAt: string;
    login?: string;
}
export declare function startDeviceFlow(): Promise<DeviceSession>;
export type PollResult = {
    kind: 'pending';
} | {
    kind: 'slow-down';
    intervalMs: number;
} | {
    kind: 'expired';
} | {
    kind: 'ok';
    accessToken: string;
};
export declare function pollForToken(session: DeviceSession): Promise<PollResult>;
/** 204 = starred; 404 = not. Anything else throws. */
export declare function checkStarred(accessToken: string): Promise<boolean>;
export declare function fetchLogin(accessToken: string): Promise<string | undefined>;
/** Full unlock sequence: device session → poll (bounded) → token → star watch.
 *  The token lives IN MEMORY ONLY for the star-watch window. First star fires
 *  onUnlocked (the persona section swap); the token is dropped at the end. */
export declare function verifyStar(session: DeviceSession, signal?: AbortSignal, onUnlocked?: (state: GateState) => void): Promise<GateState>;
