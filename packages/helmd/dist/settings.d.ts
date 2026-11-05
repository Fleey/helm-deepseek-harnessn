import { type TeamRole } from './team.js';
export interface HelmdSettings {
    team: {
        /** begin_case 也自动开一个 team ticket。 */
        autoTicket: boolean;
        defaultRoles: TeamRole[];
        /** 每 ticket 同时运行的 worker 上限。 */
        maxParallelWorkers: number;
        /** 无 budget-policy artifact 时的默认 worker 超时（分钟）。 */
        defaultWallTimeMin: number;
        /** dynamic worker 的高风险命令审批：ask | deny | allow（默认 ask）。 */
        riskApproval: 'ask' | 'deny' | 'allow';
        /** 审批队列超时秒数（1-3600；超时即拒）。 */
        approvalTimeoutSec: number;
        /** 每角色工具 allow/deny（deny 优先；allow 非空时只放行列出的工具）。 */
        roleToolPolicy: Record<string, {
            allow?: string[];
            deny?: string[];
        }>;
    };
    intercept: {
        /** 流式拒绝拦截总开关（等价 HELMD_STREAM_MODE=off）。 */
        enabled: boolean;
    };
    advisory: {
        /** case_status 是否附 [autonomy] 状态包。 */
        autonomyPacket: boolean;
        /** 工具结果后的 L4-lite 下一步建议。 */
        nextActionNudge: boolean;
        /** record_finding 前必须真实调用过 read_reference（防“假装读过文档”）。 */
        requireDocRead: boolean;
        /** 引用证据至少一条来自真实工具捕获，save_evidence 自编文本不算。 */
        requireToolEvidence: boolean;
    };
    star: {
        /** Star 弹窗延迟秒数。 */
        popupDelaySec: number;
    };
    toolbox: {
        /** 允许模型通过 toolbox 工具安装 catalog 内的 release（默认仅 UI/操作者安装）。 */
        modelInstall: boolean;
    };
}
export declare const DEFAULT_SETTINGS: HelmdSettings;
/** $DSH_HOME/storages/helmd/settings.json */
export declare function settingsPath(): string;
export declare function loadSettings(): HelmdSettings;
/** Deep-merge a patch over the stored settings, clamp, and persist. */
export declare function saveSettings(patch: unknown): HelmdSettings;
