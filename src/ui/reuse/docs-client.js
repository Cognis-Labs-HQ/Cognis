/**
 * Loads and validates the documentation index exposed by the core docs API.
 *
 * Public exports:
 * - `loadDocsIndex` — returns documentation index entries or an empty list when unavailable.
 * - `loadDocsBundleMarkdown` — reads all views at one component version.
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

export async function loadDocsBundleMarkdown(
    item,
    { fetchDocs = apiFetch, languages = [], signal } = {},
) {
    if (
        !item.slug ||
        !item.version ||
        !/^[a-zA-Z0-9_./-]+$/.test(item.slug) ||
        item.slug.includes("..") ||
        !/^(?:latest|\d+\.\d+\.\d+)$/.test(item.version)
    )
        throw new Error("docs_bundle_identity_required");
    const views =
        item.slug === "changelog" || item.slug.startsWith("changelog/")
            ? ["info"]
            : ["info", "usage", "technical"];
    const markdown = [];
    for (const view of views) {
        signal?.throwIfAborted();
        const suffix = view === "info" ? "" : `/${view}`;
        const response = await fetchDocs(
            `/api/v1/docs/${item.version}/${item.slug}${suffix}?langs=${encodeURIComponent(languages.join(","))}`,
            { signal },
        );
        if (!response.ok)
            throw new Error(`docs_bundle_load_failed:${response.status}`);
        const payload = await response.json();
        if (typeof payload?.data?.markdown !== "string")
            throw new Error("docs_bundle_markdown_required");
        markdown.push(payload.data.markdown);
    }
    return markdown.join("\n\n");
}
