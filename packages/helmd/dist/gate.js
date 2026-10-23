// Star gate + persona gating for helm-d.
//
// Locked sessions get the persona section replaced by a gate notice carrying the
// current device-flow user code. Unlocking (user authorizes + stars) flips the
// persisted state; the next assembly passes the persona through untouched.
//
// The device-flow session is a module singleton: one user_code at a time, polled
// in the background, re-issued on expiry. The token is discarded inside
// star-gate.ts (verifyStar) — nothing credential-shaped crosses this module.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, normalize } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { profileBody } from './catalog.js';
import { startDeviceFlow, verifyStar } from './star-gate.js';
// Split construction so the persona's opening line never appears as one
// contiguous literal in the distributed source (anti-grep hygiene).
const PERSONA_START_MARKER = ['You are lun', 'a — technical sec', 'urity operator'].join('');
const PERSONA_END_MARKER = '已修复未验证` / `待决策` / `已知问题`.';
const REPO = 'ADWMC/helm-d';
// Own namespace: the preset's dsh-persona row registers the empty
// 'deployment:persona-prefix' section, and same-name re-registration is
// rejected ("already registered in this scope"). A distinct name coexists.
const PERSONA_SECTION_NAME = 'helm-d:persona';
const PERSONA_SECTION_ORDER = 0;
let cachedState;
let activeSession;
let pollAbort;
let pollGeneration = 0;
let pluginCtx;
let launchSkipped = false;
let lastFlowError;
/** Operator chose to dismiss the star popup for THIS instance launch
 *  (memory-only). The persona is untouched; the background device-flow
 *  poll is aborted immediately — zero GitHub traffic after skip. */
export function skipThisLaunch() {
    launchSkipped = true;
    pollAbort?.abort();
    activeSession = undefined;
    lastFlowError = undefined;
}
/** Whether the gate is actively gating assemblies (locked AND not skipped). */
export function isGating() {
    return !isUnlocked() && !launchSkipped;
}
/** Status snapshot for the web gate panel (GET /api/helmd/gate). */
export function gateStatus() {
    const state = readState();
    // Re-issue the device session when it expired — the panel poll is the
    // heartbeat; without this the panel sticks at "生成中…" after expiry.
    if (!isUnlocked() && !launchSkipped &&
        (activeSession === undefined || Date.now() >= activeSession.expiresAt)) {
        ensureFlow();
    }
    return {
        gating: isGating(),
        unlocked: isUnlocked(),
        skipped: launchSkipped,
        starred: state?.starred ?? false,
        login: state?.login,
        userCode: activeSession?.userCode,
        verificationUri: activeSession?.verificationUri ?? 'https://github.com/login/device',
        repo: REPO,
        error: lastFlowError,
    };
}
/** $DSH_HOME (or ~/.dsh) + storages/helmd/gate-state.json. */
function statePath() {
    const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
    return normalize(join(home, 'storages', 'helmd', 'gate-state.json'));
}
function readState() {
    if (cachedState !== undefined)
        return cachedState;
    try {
        const parsed = JSON.parse(readFileSync(statePath(), 'utf8'));
        if (typeof parsed.starred === 'boolean') {
            cachedState = parsed;
            return cachedState;
        }
    }
    catch { /* first run or unreadable — treat as locked */ }
    return undefined;
}
function writeState(state) {
    cachedState = state;
    try {
        mkdirSync(dirname(statePath()), { recursive: true });
        writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
    }
    catch { /* persistence is best-effort; in-memory state still gates */ }
}
/** Whether the star gate has been passed. Checked per assembly, cheap. */
export function isUnlocked() {
    return readState()?.starred === true;
}
/** Replace the persona block inside a prompt string with the gate notice. */
/** Background device-flow runner: one session at a time, bounded poll loop. */
function ensureFlow() {
    if (activeSession !== undefined && Date.now() < activeSession.expiresAt)
        return;
    pollAbort?.abort();
    const generation = ++pollGeneration;
    const controller = new AbortController();
    pollAbort = controller;
    void (async () => {
        try {
            const session = await startDeviceFlow();
            activeSession = session;
            lastFlowError = undefined;
            // Star watch: the moment the star lands, persist state — the web panel
            // picks it up on its next poll and disappears. No prompt swap involved.
            const state = await verifyStar(session, controller.signal, (unlockedState) => {
                if (generation !== pollGeneration)
                    return;
                writeState(unlockedState);
            });
            if (generation !== pollGeneration)
                return;
            writeState(state);
            activeSession = undefined;
        }
        catch (error) {
            // Expired/cancelled/skipped: clear so the next ensureFlow() re-issues.
            if (generation === pollGeneration)
                activeSession = undefined;
            const msg = error instanceof Error ? error.message : String(error);
            if (msg !== 'aborted') {
                lastFlowError = msg;
                console.warn('[helmd] gate: device flow ended:', msg);
            }
        }
    })();
}
/** Register the gate on the prompt-assembly waterfall + unlock/status tools. */
/** Register the gate on the prompt-assembly waterfall + unlock/status tools.
 *  Locked: the persona section is shadowed by the gate notice; the device flow
 *  starts LAZILY on the first gated assembly (helmd mode actually used).
 *  Unlocked: the persona section carries the active profile body. */
export function registerGate(ctx) {
    pluginCtx = ctx;
    // v0.5.0 ruling (operator): the persona is NEVER gated. The active profile
    // body loads unconditionally; the star ask is a WEB-PANEL POPUP ONLY —
    // annoying, not blocking. Skip = this launch ignores the popup.
    try {
        applyPersonaSection(ctx, profileBody() ?? '');
    }
    catch (error) {
        console.warn('[helmd] gate: persona section registration failed:', error instanceof Error ? error.message : error);
    }
    // Star ask: run the device flow at apply so the web panel has a live code.
    ensureFlow();
    ctx.tools.register(defineTool({
        name: 'helmd_unlock',
        description: '刷新 helm-d star 门状态：返回当前一次性代码与解锁进度。',
        parameters: {},
        output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
        async execute() {
            ensureFlow();
            const state = readState();
            if (state?.starred === true)
                return `已 Star（${state.login ?? '已校验'}）——弹窗不再出现。`;
            return [
                '状态：等待授权（不影响任何功能，弹窗可点「跳过本次启动」关掉）',
                `1. 打开 ${activeSession?.verificationUri ?? 'https://github.com/login/device'}`,
                `2. 输入代码：${activeSession?.userCode ?? '(生成中…稍后再调一次本工具)'}`,
                `3. 授权后给 ${REPO} 点 Star。`,
            ].join('\n');
        },
    }));
}
/** Register the persona system-prompt section (shadows the preset persona row). */
export function applyPersonaSection(ctx, text) {
    const host = ctx;
    if (!host.systemPrompt || typeof host.systemPrompt.section !== 'function') {
        throw new Error('systemPrompt service unavailable');
    }
    const order = typeof host.systemPrompt.getSectionOrder === 'function'
        ? host.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX')
        : PERSONA_SECTION_ORDER;
    host.systemPrompt.section({ name: PERSONA_SECTION_NAME, order, text });
}
//# sourceMappingURL=gate.js.map