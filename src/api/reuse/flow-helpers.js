/**
 * Returns the first value for a flow stage result array or null when absent.
 *
 * @param {Record<string, unknown[] | undefined>} stageResults
 * @param {string} stageId
 * @returns {unknown | null}
 */
export function getFirstStageResult(stageResults, stageId) {
    const results = stageResults?.[stageId];
    if (!Array.isArray(results)) return null;
    return results[0] ?? null;
}
