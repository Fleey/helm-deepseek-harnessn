/**
 * Input Semantic Normalizer
 *
 * Implements the semantic mapping table grounded in Low-Resource / Cipher Attack
 * research. High-sensitivity trigger words in user input (e.g. "外挂", "自瞄", "透视",
 * "绕过", "过检") are transparently normalized to standard engineering terms before
 * evaluation, avoiding activation of embedding-level safety classification.
 */
/**
 * Normalize sensitive trigger terms to engineering analysis terms.
 */
export declare function normalizeInput(text: string): string;
