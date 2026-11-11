export type PocVerdict = 'verified' | 'refuted' | 'inconclusive';
export interface PocRequest {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
    headers?: Record<string, string>;
    body?: string;
}
export interface PocRecipe {
    id: string;
    vulnClass: string;
    description: string;
    /** Regex that marks the positive response as a hit. */
    successRegex: string;
    positive: PocRequest;
    negative: PocRequest;
    /** Requests are idempotent/safe by default; state-changing recipes need an
     *  explicit approval before the runner will execute them. */
    safe: boolean;
}
export declare const POC_RECIPES: PocRecipe[];
export declare function recipeById(id: string): PocRecipe | undefined;
/** Apply caller-supplied URL/headers/body to a recipe template. Query strings
 *  are appended without re-encoding an existing query. */
export declare function renderPocRequest(recipe: PocRequest, overrides: {
    path?: string;
    headers?: Record<string, string>;
    body?: string;
}): PocRequest;
/** Three-state verdict: a positive hit without a negative hit verifies; a
 *  negative hit or a non-reproducing positive is inconclusive/refuted. */
export declare function classifyPoc(positiveHit: boolean, negativeHit: boolean): {
    verdict: PocVerdict;
    reason: string;
};
