/**
 * Loads and validates the documentation index exposed by the core docs API.
 *
 * Public exports:
 * - `resolveDocsGroupLabels` — resolves stable group identities to localized display names.
 * - `loadDocsIndex` — returns documentation index entries or an empty list when unavailable.
 * - `loadDocsBundleMarkdown` — reads all views at one component version.
 *
 * @example
 * const docs = await loadDocsIndex();
 *
 * @param {{ fetchDocs?: (path: string) => Promise<Response> }} [options]
 * @returns {Promise<Array<Record<string, unknown>>>} Valid documentation entries.
 */
import { localizeModulePresentation } from "./presentation.js";
import { apiFetch } from "./api-client.js";
import { activeUiLanguage, enabledUiLanguages } from "./ui-language-state.js";

export function readDocsLanguages() {
    return [
        ...new Set(
            [
                activeUiLanguage() ??
                    globalThis.document?.documentElement?.lang,
                ...enabledUiLanguages(),
                "en",
            ]
                .filter((language) => typeof language === "string")
                .map((language) => language.trim().toLowerCase().split("-")[0])
                .filter((language) => /^[a-z]{2}$/.test(language)),
        ),
    ];
}

export async function loadDocsIndex({
    fetchDocs = apiFetch,
    languages = readDocsLanguages(),
    signal,
} = {}) {
    const response = await fetchDocs(
        `/api/v1/docs?langs=${encodeURIComponent(languages.join(","))}`,
        { signal },
    ).catch(() => null);
    if (!response?.ok) return [];
    const payload = await response.json().catch(() => null);
    if (!Array.isArray(payload?.data)) return [];
    return payload.data.filter(
        (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
    );
}

export async function loadDocsBundleMarkdown(
    item,
    { fetchDocs = apiFetch, languages = readDocsLanguages(), signal } = {},
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

// platform is the fallback group for ungrouped root-level docs.
const GROUP_KEYS = {
    platform: "ui.app.docs.group.platform",
    components: "ui.reuse.components",
    gateways: "ui.app.docs.group.gateways",
    "adapters/auth": "ui.app.docs.group.adapters_auth",
    "adapters/db": "ui.app.docs.group.adapters_db",
    "adapters/file": "ui.app.docs.group.adapters_file",
    "adapters/notify": "ui.app.docs.group.adapters_notify",
    "adapters/calendar": "ui.app.docs.group.adapters.calendar",
    "adapters/registration": "ui.app.docs.group.adapters.registration",
    "adapters/share": "ui.app.docs.group.adapters.share",
    "adapters/social": "ui.app.docs.group.adapters.social",
    "adapters/study": "ui.app.docs.group.adapters.study",
    "adapters/tfa": "ui.app.docs.group.adapters.tfa",
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
