import {
    loadDocsIndex,
    loadDocsBundleMarkdown,
    readDocsLanguages,
} from "../docs-client.js";
import { createI18n } from "../i18n.js";
/**
 * Documentation search emits navigation metadata before reading document bodies.
 * Public export: collectGlobalDocsSearchGroups({ signal, onResults }).
 * @example collectGlobalDocsSearchGroups({ signal, onResults: renderGroups });
 */
import { resolveDocsGroupLabels } from "../docs-client.js";

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
export async function collectGlobalDocsSearchGroups({
    signal,
    onResults,
} = {}) {
    const token = localStorage.getItem("cognis_access_token");
    const languages = readDocsLanguages();
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
    const docs = await loadDocsIndex({
        fetchDocs: (path) => fetch(path, request),
        languages,
        signal,
    });
    const labels = await resolveDocsGroupLabels(i18n, docs);
    const docsLabel = i18n.t("ui.reuse.docs");
    const changelogsLabel = i18n.t("ui.layout.footer.changelogs");
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
                    description: `${changelog ? changelogsLabel : docsLabel} / ${labels.get(item.group || "platform")}`,
                    url: changelog
                        ? `/changelogs/${slug.replace(/^changelog\//, "")}`
                        : `/docs/${slug}`,
                    resultClass: "page",
                    visible: true,
                    searchText: [
                        title,
                        slug,
                        labels.get(item.group || "platform"),
                        item.group,
                        item.description,
                    ]
                        .filter(Boolean)
                        .join(" "),
                },
            };
        });
    const groups = () =>
        [
            {
                category: docsLabel,
                items: entries
                    .filter((entry) => !entry.changelog)
                    .map((entry) => ({
                        ...entry.item,
                        searchText: `${entry.item.searchText} ${cachedContent.get(entry.key) ?? ""}`,
                    })),
            },
            {
                category: changelogsLabel,
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
                const markdown = await loadDocsBundleMarkdown(entry, {
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
                console.error("[search-bar]:document-index-failed", {
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
