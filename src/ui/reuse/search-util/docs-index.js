/**
 * Documentation search emits navigation metadata before reading document bodies.
 * Public export: collectGlobalDocsSearchGroups({ signal, onResults }).
 * @example collectGlobalDocsSearchGroups({ signal, onResults: renderGroups });
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
export async function collectGlobalDocsSearchGroups({
    signal,
    onResults,
} = {}) {
    const token = localStorage.getItem("cognis_access_token");
    const identity = JSON.stringify([
        localStorage.getItem("cognis_account"),
        token,
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
    const response = await fetch("/api/v1/docs", request);
    if (!response.ok) throw new Error("docs_search_index_unavailable");
    const payload = await response.json();
    const docs = Array.isArray(payload?.data) ? payload.data : [];
    const langs = localStorage.getItem("cognis_language_priority") ?? "";
    const entries = docs
        .filter((item) => String(item?.slug ?? "").trim())
        .map((item) => {
            const slug = String(item.slug).trim();
            const title = String(item.title ?? slug)
                .split("/")
                .pop()
                .split("-")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ");
            const changelog = slug.startsWith("changelog/");
            return {
                slug,
                key: JSON.stringify([langs, slug]),
                changelog,
                item: {
                    id: `global-docs:${slug}`,
                    label: title,
                    description: `${changelog ? "Changelogs" : "Docs"} / ${item.group || "platform"}`,
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
                category: "Docs",
                items: entries
                    .filter((entry) => !entry.changelog)
                    .map((entry) => ({
                        ...entry.item,
                        searchText: `${entry.item.searchText} ${cachedContent.get(entry.key) ?? ""}`,
                    })),
            },
            {
                category: "Changelogs",
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
                const body = await fetch(
                    `/api/v1/docs/${entry.slug}?langs=${encodeURIComponent(langs)}`,
                    request,
                );
                if (!body.ok)
                    throw new Error("docs_search_content_unavailable");
                const html = await body.text();
                if (signal?.aborted) return;
                cachedContent.set(entry.key, textFromHtml(html));
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
