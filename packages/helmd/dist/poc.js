// Deterministic PoC recipes and three-state classification (T-15).
//
// A recipe is data, not a scanner: the model fills URL/parameters, the runner
// sends the positive and negative request, and the verdict is derived from the
// success regex on both. No shell, no arbitrary payload execution.
const JSON_HEADERS = { 'content-type': 'application/json' };
export const POC_RECIPES = [
    {
        id: 'http-diff',
        vulnClass: 'http-diff',
        description: 'Compare a candidate request with a benign control; useful for auth/status-code differences.',
        successRegex: '"(?:admin|success|true)"|HTTP/\\d\\.\\d 2\\d\\d',
        positive: { method: 'GET', headers: { 'x-poc': '1' } },
        negative: { method: 'GET', headers: { 'x-poc': '0' } },
        safe: true,
    },
    {
        id: 'sqli-boolean',
        vulnClass: 'sqli',
        description: 'Boolean-based SQLi: true condition must match the success marker, false/control must not.',
        successRegex: 'welcome|admin|1 row|login success',
        positive: { method: 'GET' },
        negative: { method: 'GET' },
        safe: true,
    },
    {
        id: 'path-traversal',
        vulnClass: 'path-traversal',
        description: 'Path traversal against a file endpoint; success regex should be a file signature such as root:.',
        successRegex: 'root:.*:0:0:|\\[boot loader\\]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY',
        positive: { method: 'GET' },
        negative: { method: 'GET' },
        safe: true,
    },
    {
        id: 'idor',
        vulnClass: 'idor',
        description: 'Object-level authorization: a second identity must not receive the first identity object.',
        successRegex: '"email"|"user"|"account"|"balance"',
        positive: { method: 'GET' },
        negative: { method: 'GET' },
        safe: true,
    },
    {
        id: 'xss-canary',
        vulnClass: 'xss',
        description: 'Reflected canary: the unique marker must appear unescaped in the positive response.',
        successRegex: '<svg/onload=alert\\(1\\)>|<script>alert\\(1\\)</script>',
        positive: { method: 'GET' },
        negative: { method: 'GET' },
        safe: true,
    },
    {
        id: 'jwt-none',
        vulnClass: 'auth-bypass',
        description: 'JWT alg=none acceptance: a stripped-signature token must not authorize the request.',
        successRegex: '"role"\\s*:\\s*"admin"|"authenticated"\\s*:\\s*true',
        positive: { method: 'GET' },
        negative: { method: 'GET' },
        safe: true,
    },
    {
        id: 'state-change',
        vulnClass: 'state-change',
        description: 'Placeholder for a state-changing proof; requires an explicit approval and is not safe by default.',
        successRegex: '"ok"|"success"|"updated"',
        positive: { method: 'POST', headers: JSON_HEADERS, body: '{}' },
        negative: { method: 'POST', headers: JSON_HEADERS, body: '{}' },
        safe: false,
    },
];
export function recipeById(id) {
    return POC_RECIPES.find((recipe) => recipe.id === id);
}
/** Apply caller-supplied URL/headers/body to a recipe template. Query strings
 *  are appended without re-encoding an existing query. */
export function renderPocRequest(recipe, overrides) {
    return {
        method: recipe.method,
        ...(recipe.headers !== undefined || overrides.headers !== undefined
            ? { headers: { ...(recipe.headers ?? {}), ...(overrides.headers ?? {}) } }
            : {}),
        ...(overrides.body !== undefined ? { body: overrides.body } : recipe.body !== undefined ? { body: recipe.body } : {}),
    };
}
/** Three-state verdict: a positive hit without a negative hit verifies; a
 *  negative hit or a non-reproducing positive is inconclusive/refuted. */
export function classifyPoc(positiveHit, negativeHit) {
    if (positiveHit && !negativeHit)
        return { verdict: 'verified', reason: 'positive hit; independent control did not hit' };
    if (positiveHit && negativeHit)
        return { verdict: 'inconclusive', reason: 'control also hit; the marker is not payload-specific' };
    return { verdict: 'refuted', reason: 'positive request did not reproduce the expected marker' };
}
//# sourceMappingURL=poc.js.map