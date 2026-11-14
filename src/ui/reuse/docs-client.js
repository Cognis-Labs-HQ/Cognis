/**
 * Loads and validates the documentation index exposed by the core docs API.
 *
 * Public exports:
 * - `resolveDocsGroupLabels` — resolves stable group identities to localized display names.
 * - `loadDocsIndex` — returns documentation index entries or an empty list when unavailable.
 *
 * @example
 * const docs = await loadDocsIndex();
 *
 * @param {{ fetchDocs?: (path: string) => Promise<Response> }} [options]
 * @returns {Promise<Array<Record<string, unknown>>>} Valid documentation entries.
 */
import { localizeModulePresentation } from "./presentation.js";
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

// platform is the fallback group for ungrouped root-level docs.
const GROUP_KEYS = {
    platform: "ui.app.docs.group.platform",
    gateways: "ui.app.docs.group.gateways",
    "adapters/auth": "ui.app.docs.group.adapters_auth",
    "adapters/db": "ui.app.docs.group.adapters_db",
    "adapters/file": "ui.app.docs.group.adapters_file",
    "adapters/notify": "ui.app.docs.group.adapters_notify",
    modules: "ui.reuse.modules",
    tooling: "ui.app.docs.group.tooling",
};

/**
 * @param {object} i18n - Active UI locale resolver.
 * @param {Array<object>} docs - Public documentation index entries.
 * @returns {Promise<Map<string, string>>} Labels keyed by stable group identity.
 */
export async function resolveDocsGroupLabels(i18n, docs) {
    const groups = new Map();
    for (const item of docs) {
        const group = item.group || "platform";
        groups.set(group, item.groupPresentation ?? groups.get(group));
    }
    const labels = new Map();
    for (const [group, presentation] of groups) {
        if (presentation) {
            const localized = await localizeModulePresentation(
                presentation,
                i18n,
            );
            labels.set(group, localized.localizedPresentation.name);
        } else {
            const key = GROUP_KEYS[group];
            labels.set(
                group,
                key
                    ? i18n.t(key)
                    : group
                          .split("/")
                          .map(
                              (part) =>
                                  part.charAt(0).toUpperCase() + part.slice(1),
                          )
                          .join(" › "),
            );
        }
    }
    return labels;
}
