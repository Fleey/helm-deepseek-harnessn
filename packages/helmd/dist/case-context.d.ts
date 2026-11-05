import type { Context } from '@deepseek-ai/cordis';
import { type CaseInfo } from './case.js';
export declare const CASE_SECTION = "helm-d:case";
export declare function renderCaseContext(info: CaseInfo): string;
export declare function registerCaseContext(ctx: Context): void;
