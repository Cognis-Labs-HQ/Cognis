import { bindCapability } from "../capabilities.js";

import {
    loadDocumentsIndex,
    loadDocumentsBundleMarkdown,
    readDocumentsLanguages,
} from "../docs-client.js";
import { createI18n } from "../i18n.js";

const log = bindCapability("ui:log");
/**
 * Documentation search emits navigation metadata before reading document bodies.
 * Public export: collectGlobalDocumentsSearchGroups({ signal, onResults }).
 * @example collectGlobalDocumentsSearchGroups({ signal, onResults: renderGroups });
 */
let content = new Map();
let contentIdentity = "";

function textFromHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    template.content
        .querySelectorAll("script, style")
        .forEach((node) => node.remove());
    return String(template.content.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Returns partial groups promptly and uses four cancellable workers for content. */
async function collectGlobalDocumentsSearchGroups({ signal, onResults } = {}) {
    const token = localStorage.getItem("cognis_access_token");
    const languages = readDocumentsLanguages();
    const i18n = await createI18n({
        preferredLanguages: languages,
        persistLocale: false,
    });
    const identity = JSON.stringify([
        localStorage.getItem("cognis_account"),
        token,
        languages,
    ]);
    if (identity !== contentIdentity) {
        contentIdentity = identity;
        content = new Map();
    }
    const cachedContent = content;
    const request = {
        credentials: "same-origin",
        signal,
        headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    const docs = await loadDocumentsIndex({
        fetchDocs: (path) => fetch(path, request),
        languages,
        signal,
    });
    const entries = docs
        .filter((item) => String(item?.slug ?? "").trim())
        .map((item) => {
            const slug = String(item.slug).trim();
            const title = String(item.title ?? slug);
            const changelog = slug.startsWith("changelog/");
            return {
                slug,
                version: item.version,
                key: JSON.stringify([languages, slug, item.version]),
                changelog,
                item: {
                    id: `global-docs:${slug}`,
                    label: title,
                    description: i18n.t(
                        changelog
                            ? "ui.layout.footer.changelogs"
                            : "ui.reuse.docs",
                    ),
                    url: changelog
                        ? `/changelogs/${slug.replace(/^changelog\//, "")}`
                        : `/docs/${slug}`,
                    resultClass: "page",
                    visible: true,
                    searchText: [title, slug, item.group, item.description]
                        .filter(Boolean)
                        .join(" "),
                },
            };
        });
    const groups = () =>
        [
            {
                category: i18n.t("ui.reuse.docs"),
                items: entries
                    .filter((entry) => !entry.changelog)
                    .map((entry) => ({
                        ...entry.item,
                        searchText: `${entry.item.searchText} ${cachedContent.get(entry.key) ?? ""}`,
                    })),
            },
            {
                category: i18n.t("ui.layout.footer.changelogs"),
                items: entries
                    .filter((entry) => entry.changelog)
                    .map((entry) => ({
                        ...entry.item,
                        searchText: `${entry.item.searchText} ${cachedContent.get(entry.key) ?? ""}`,
                    })),
            },
        ].filter((group) => group.items.length);
    if (!signal?.aborted) onResults?.(groups());
    let next = 0;
    let lastEmission = Date.now();
    async function worker() {
        while (next < entries.length && !signal?.aborted) {
            const entry = entries[next++];
            if (cachedContent.has(entry.key)) continue;
            try {
                const markdown = await loadDocumentsBundleMarkdown(entry, {
                    fetchDocs: (path) => fetch(path, request),
                    signal,
                    languages,
                });
                if (signal?.aborted) return;
                cachedContent.set(entry.key, textFromHtml(markdown));
                if (Date.now() - lastEmission >= 100) {
                    lastEmission = Date.now();
                    onResults?.(groups());
                }
            } catch (error) {
                if (signal?.aborted) return;
                void log("error", "[search-bar]:document-index-failed", {
                    component: "search",
                    operation: "indexDocument",
                    slug: entry.slug,
                    error,
                });
            }
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(4, entries.length) }, worker),
    );
    return groups();
}
export { collectGlobalDocumentsSearchGroups };
