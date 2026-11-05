import type { Context } from '@deepseek-ai/cordis';
export declare const name = "helmd-advisory";
/** Prompt assembly must exist before this listener can register. */
export declare const inject: string[];
/** Standing metric key for the delivery discipline. */
export declare const STANCE_KEY = "stance:no-hedge";
/** Standing metric key for the challenge-the-premise discipline. */
export declare const CHALLENGE_KEY = "stance:challenged";
/** Standing metric key for the delivery-report format. */
export declare const REPORT_KEY = "stance:report-prefix";
/** Standing metric key for the input normalizer discipline. */
export declare const NORMALIZER_KEY = "stance:normalizer";
/** Whether a user turn asks for a delivery report. Exported for the host-seam checks. */
export declare function isReportRequest(text: string): boolean;
export declare function registerAdvisoryHook(ctx: Context): void;
