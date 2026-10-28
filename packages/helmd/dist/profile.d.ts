export interface ProfileSummary {
    id: string;
    name: string;
    active: boolean;
}
export interface ProfileStatus {
    activeId: string;
    profiles: ProfileSummary[];
}
/** Active profile id: persisted choice when it still exists in the catalog,
 *  otherwise the build-time default. A stale id must never blank the persona. */
export declare function getActiveProfileId(): string;
/** Persist the operator's choice after validating it against the catalog. */
export declare function setActiveProfileId(id: string): void;
/** Enumerable catalog + which entry is active (web panel payload). */
export declare function profileStatus(): ProfileStatus;
