// Operator settings for helm-d runtime features.
//
// One store, two editors: the DSH settings page edits the composition row's
// Config (applied at boot by the host row), and the workbench 设置 tab edits
// this file directly through /api/helmd/settings. Boot always merges the row
// config over the file, so the official settings form wins after a restart;
// the workbench wins for the running process.
//
// Every consumer reads through loadSettings() so a missing/corrupt file falls
// back to defaults instead of disabling the feature.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, normalize } from 'node:path';
import { TEAM_ROLES } from './team.js';
export const DEFAULT_SETTINGS = {
    team: {
        autoTicket: false,
        defaultRoles: ['triage', 'static', 'critic', 'reporter'],
        maxParallelWorkers: 4,
        defaultWallTimeMin: 15,
        riskApproval: 'ask',
        approvalTimeoutSec: 300,
        roleToolPolicy: {},
    },
    intercept: { enabled: true },
    advisory: { autonomyPacket: true, nextActionNudge: true, requireDocRead: true, requireToolEvidence: true },
    star: { popupDelaySec: 2 },
    toolbox: { modelInstall: false },
};
function clampNumber(value, min, max, fallback) {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}
function clampBool(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
function normalizeSettings(raw) {
    const src = (raw !== null && typeof raw === 'object' ? raw : {});
    const team = (src.team !== null && typeof src.team === 'object' ? src.team : {});
    const intercept = (src.intercept !== null && typeof src.intercept === 'object' ? src.intercept : {});
    const advisory = (src.advisory !== null && typeof src.advisory === 'object' ? src.advisory : {});
    const star = (src.star !== null && typeof src.star === 'object' ? src.star : {});
    const roles = Array.isArray(team.defaultRoles)
        ? [...new Set(team.defaultRoles.map(String))].filter((role) => TEAM_ROLES.includes(role))
        : [];
    const roleToolPolicy = {};
    if (team.roleToolPolicy !== null && typeof team.roleToolPolicy === 'object') {
        for (const [role, raw] of Object.entries(team.roleToolPolicy)) {
            if (!TEAM_ROLES.includes(role) || raw === null || typeof raw !== 'object')
                continue;
            const policy = raw;
            const allow = Array.isArray(policy.allow) ? policy.allow.map(String).filter(Boolean) : undefined;
            const deny = Array.isArray(policy.deny) ? policy.deny.map(String).filter(Boolean) : undefined;
            if ((allow?.length ?? 0) > 0 || (deny?.length ?? 0) > 0) {
                roleToolPolicy[role] = {
                    ...(allow !== undefined && allow.length > 0 ? { allow } : {}),
                    ...(deny !== undefined && deny.length > 0 ? { deny } : {}),
                };
            }
        }
    }
    const riskApproval = team.riskApproval === 'deny' || team.riskApproval === 'allow' ? team.riskApproval : 'ask';
    const d = DEFAULT_SETTINGS;
    return {
        team: {
            autoTicket: clampBool(team.autoTicket, d.team.autoTicket),
            defaultRoles: roles.length > 0 ? roles : [...d.team.defaultRoles],
            maxParallelWorkers: clampNumber(team.maxParallelWorkers, 1, 8, d.team.maxParallelWorkers),
            defaultWallTimeMin: clampNumber(team.defaultWallTimeMin, 1, 60, d.team.defaultWallTimeMin),
            riskApproval,
            approvalTimeoutSec: clampNumber(team.approvalTimeoutSec, 1, 3600, d.team.approvalTimeoutSec),
            roleToolPolicy,
        },
        intercept: { enabled: clampBool(intercept.enabled, d.intercept.enabled) },
        advisory: {
            autonomyPacket: clampBool(advisory.autonomyPacket, d.advisory.autonomyPacket),
            nextActionNudge: clampBool(advisory.nextActionNudge, d.advisory.nextActionNudge),
            requireDocRead: clampBool(advisory.requireDocRead, d.advisory.requireDocRead),
            requireToolEvidence: clampBool(advisory.requireToolEvidence, d.advisory.requireToolEvidence),
        },
        star: { popupDelaySec: clampNumber(star.popupDelaySec, 0, 60, d.star.popupDelaySec) },
        toolbox: { modelInstall: clampBool(src.toolbox?.modelInstall, d.toolbox.modelInstall) },
    };
}
/** $DSH_HOME/storages/helmd/settings.json */
export function settingsPath() {
    const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh');
    return normalize(join(home, 'storages', 'helmd', 'settings.json'));
}
export function loadSettings() {
    try {
        return normalizeSettings(JSON.parse(readFileSync(settingsPath(), 'utf8')));
    }
    catch {
        return structuredClone(DEFAULT_SETTINGS);
    }
}
/** Deep-merge a patch over the stored settings, clamp, and persist. */
export function saveSettings(patch) {
    const current = loadSettings();
    const src = (patch !== null && typeof patch === 'object' ? patch : {});
    const merged = {
        team: { ...current.team, ...(src.team !== null && typeof src.team === 'object' ? src.team : {}) },
        intercept: { ...current.intercept, ...(src.intercept !== null && typeof src.intercept === 'object' ? src.intercept : {}) },
        advisory: { ...current.advisory, ...(src.advisory !== null && typeof src.advisory === 'object' ? src.advisory : {}) },
        star: { ...current.star, ...(src.star !== null && typeof src.star === 'object' ? src.star : {}) },
    };
    const next = normalizeSettings(merged);
    try {
        const path = settingsPath();
        mkdirSync(dirname(path), { recursive: true });
        const temp = `${path}.${process.pid}.tmp`;
        writeFileSync(temp, JSON.stringify(next, null, 2), 'utf8');
        renameSync(temp, path);
    }
    catch { /* read-only home: the merged value still governs this process */ }
    return next;
}
//# sourceMappingURL=settings.js.map