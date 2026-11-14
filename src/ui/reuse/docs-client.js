/**
 * Loads and validates the documentation index exposed by the core docs API.
 *
 * Public exports:
 * - `loadDocsIndex` — returns documentation index entries or an empty list when unavailable.
 *
 * @example
 * const docs = await loadDocsIndex();
 *
 * @param {{ fetchDocs?: (path: string) => Promise<Response> }} [options]
 * @returns {Promise<Array<Record<string, unknown>>>} Valid documentation entries.
 */
import { apiFetch } from "./api-client.js";

export async function loadDocsIndex({ fetchDocs = apiFetch } = {}) {
    const response = await fetchDocs("/api/v1/docs").catch(() => null);
    if (!response?.ok) return [];
    const payload = await response.json().catch(() => null);
    if (!Array.isArray(payload?.data)) return [];
    return payload.data.filter(
        (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
    );
}
