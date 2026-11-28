import { renderDocumentViews } from "./views.js";
import { reportClientError } from "../../reuse/error-reporting.js";
import { showToast } from "../../reuse/toast.js";
import { guides } from "./guides.js";
import {
    loadDocumentsIndex,
    loadDocumentsBundleMarkdown,
    readDocumentsLanguages,
} from "../../reuse/docs-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { loadMarkdownDocumentHtml } from "../../reuse/markdown-document.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { navigateTo } from "../../reuse/app-router.js";
import { registerSearchIndex } from "../../reuse/search-util/popup.js";
import { createSideMenu } from "../../reuse/side-menu.js";

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

function groupLabel(i18n, group) {
    const key = GROUP_KEYS[group];
    if (key) return i18n.t(key);
    return group
        .split("/")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" › ");
}

function documentTitle(item) {
    return (
        item.title ||
        item.slug
            .split("/")
            .pop()
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
    );
}

function createDocumentsSearchProvider(i18n, docs, activeDocumentContent) {
    return async () => {
        const documentsItems = [];
        const changelogItems = [];
        for (const item of docs ?? []) {
            const title = documentTitle(item);
            let contentText = activeDocumentContent.get(item.slug) ?? "";
            if (!contentText) {
                try {
                    contentText = await loadDocumentsBundleMarkdown(item, {
                        languages: readDocumentsLanguages(),
                    });
                    activeDocumentContent.set(item.slug, contentText);
                } catch (error) {
                    reportClientError({
                        component: "docs",
                        operation: "index_document",
                        slug: item.slug,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                    contentText = "";
                }
            }
            const searchItem = {
                id: `docs:${item.slug}`,
                label: title,
                description: `${isChangelogDocument(item) ? i18n.t("ui.layout.footer.changelogs") : i18n.t("ui.reuse.docs")} / ${groupLabel(i18n, item.group || "platform")}`,
                resultClass: "page",
                url: isChangelogDocument(item)
                    ? changelogSlugToRoutePath(item.slug)
                    : `/docs/${item.slug}`,
                searchText: [
                    title,
                    item.slug,
                    item.group,
                    item.description,
                    contentText,
                ]
                    .filter(Boolean)
                    .join(" "),
            };
            if (isChangelogDocument(item)) {
                changelogItems.push(searchItem);
            } else {
                documentsItems.push(searchItem);
            }
        }
        return [
            documentsItems.length
                ? { category: i18n.t("ui.reuse.docs"), items: documentsItems }
                : null,
            changelogItems.length
                ? {
                      category: i18n.t("ui.layout.footer.changelogs"),
                      items: changelogItems,
                  }
                : null,
        ].filter(Boolean);
    };
}
function normalizeDocumentSlug(href) {
    return href
        .replace(/[?#].*$/, "")
        .replace(/^\.\//, "")
        .replace(/^\//, "")
        .replace(/^docs\/?/, "")
        .replace(/^api\/v1\/docs\/?/, "")
        .replace(/^(?:latest|\d+\.\d+\.\d+)\//, "")
        .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
        .replace(/\.md$/i, "");
}

function documentsRoute(version, slug, view = "info") {
    return `/docs/${version}/${slug}${view === "info" ? "" : "/" + view}`;
}

function parseDocumentsPath(pathname) {
    const segments = pathname.replace(/^\/docs\/?/, "").split("/");
    const hasVersion =
        segments[0] === "latest" || /^\d+\.\d+\.\d+$/.test(segments[0]);
    const view = ["usage", "technical"].includes(segments.at(-1))
        ? segments.pop()
        : "info";
    return {
        view,
        version: hasVersion ? segments.shift() : "latest",
        slug: segments.join("/"),
    };
}

function renderVersionBar(i18n, item, selectedVersion, view) {
    if (!item) return "";
    const versions = ["latest", ...(item.versions ?? [])];
    const links = versions.map((version) => {
        const label =
            version === "latest"
                ? i18n.t("ui.app.docs.version.latest")
                : `v${version}`;
        const active = version === selectedVersion;
        return `<a class="docs-version-link${active ? " active" : ""}" href="${documentsRoute(version, item.slug, view)}" data-doc-version="${version}"${active ? ' aria-current="page"' : ""}>${label}</a>`;
    });
    return `<nav class="docs-version-bar" aria-label="${i18n.t("ui.app.docs.version.label")}">${links.join("")}</nav>`;
}

function isChangelogDocument(item) {
    return item.slug === "changelog" || item.slug.startsWith("changelog/");
}

function isChangelogSlug(slug) {
    return slug === "changelog" || slug.startsWith("changelog/");
}

function changelogSlugToRoutePath(slug) {
    if (slug === "changelog") return "/changelogs";
    if (slug.startsWith("changelog/")) {
        return `/changelogs/${slug.slice("changelog/".length)}`;
    }
    return "/changelogs";
}

function createNavigationGroups(i18n, items) {
    const groups = new Map();
    for (const item of items) {
        const groupKey = item.group || "platform";
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
    }

    return Array.from(groups, ([group, groupItems]) => ({
        id: group,
        label: groupLabel(i18n, group),
        items: groupItems.map((item) => ({
            id: item.slug,
            label: documentTitle(item),
        })),
    }));
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.docs");

    let activeHtml = null;
    let activeVersionBar = "";
    let activeViews = "";
    let activeSelection = { slug: "", version: "latest", view: "info" };
    let requestSequence = 0;
    const documentsSearchContent = new Map();

    function renderActiveDocument() {
        const documentElement = root.querySelector("#doc");
        if (!documentElement || activeHtml === null) return;
        documentElement.innerHTML = `${activeVersionBar}${activeViews}<div data-doc-content>${activeHtml}</div>`;
    }

    async function showDocument(
        slug,
        { pushHistory = true, signal, version = "latest", view = "info" } = {},
    ) {
        const route = parseDocumentsPath(`/docs/${slug}`);
        if (route.view !== "info") {
            slug = route.slug;
            view = route.view;
        }
        const languages = readDocumentsLanguages().join(",");
        const item = navigationDocuments.find(
            (document) => document.slug === slug,
        );
        if (!item) return;
        const sequence = ++requestSequence;
        let html;
        try {
            html = await loadMarkdownDocumentHtml(
                `/api/v1/docs/${version === "latest" ? item.version : version}/${slug}${view === "info" ? "" : "/" + view}?langs=${encodeURIComponent(languages)}`,
                { relativeLinks: true, headingIds: true },
            );
        } catch (error) {
            if (signal?.aborted || sequence !== requestSequence) return;
            reportClientError({
                component: "docs",
                operation: "load_document",
                slug,
                version,
                view,
                error: error.message,
            });
            showToast(i18n.t("ui.app.docs.load_error"), { variant: "error" });
            return;
        }
        // If the page was navigated away from while the fetch was in flight,
        // bail out before touching the DOM or history (fall through to nothing).
        if (signal?.aborted || sequence !== requestSequence) return;
        activeHtml = html;
        activeSelection = { slug, version, view };
        activeVersionBar = renderVersionBar(i18n, item, version, view);
        activeViews = renderDocumentViews(i18n, view);
        if (version === "latest" || version === item.version)
            documentsSearchContent.delete(slug);
        renderActiveDocument();

        if (pushHistory) {
            window.history.pushState(
                { slug, version, view },
                "",
                documentsRoute(version, slug, view),
            );
        } else {
            window.history.replaceState(
                { slug, version, view },
                "",
                documentsRoute(version, slug, view),
            );
        }

        navigationMenu.setActive(slug);
    }

    function resolveDefaultSlug(subpath, selectableDocuments) {
        if (
            subpath &&
            selectableDocuments.find((document) => document.slug === subpath)
        ) {
            return subpath;
        }
        return (
            selectableDocuments.find((document) => document.slug === "overview")
                ?.slug ??
            selectableDocuments.find((document) => document.slug === "index")
                ?.slug ??
            selectableDocuments[0]?.slug
        );
    }

    const docs = await loadDocumentsIndex({ signal });
    const navigationDocuments = docs.filter(
        (document) => !isChangelogDocument(document),
    );
    const navigationMenu = createSideMenu({
        groups: createNavigationGroups(i18n, navigationDocuments),
        storageKeyPrefix: "docs-group-open",
        onSelect: (slug) => showDocument(slug, { signal }),
    });
    registerSearchIndex(
        "docs",
        createDocumentsSearchProvider(i18n, docs, documentsSearchContent),
    );

    const elements = [
        {
            id: "doc-reader",
            label: i18n.t("ui.reuse.docs"),
            gridSize: { default: [4, 8], min: [2, 4], max: "full" },
            render: () => `<article id="doc" class="content-panel"></article>`,
        },
    ];

    const composer = createPageComposer(root, {
        tutorials: guides,
        signal,
        allowCustomization: false,
        elements,
        preferenceKey: "docs-layout",
        i18n,
        onRender: renderActiveDocument,
        pageContext: {
            title: i18n.t("ui.reuse.docs"),
            subtitle: i18n.t("ui.app.docs.page_subtitle"),
        },
        toolbar: [
            {
                id: "docs-nav",
                label: i18n.t("ui.reuse.navigation"),
                render: () =>
                    `<div data-docs-navigation><h3>${i18n.t("ui.reuse.navigation")}</h3>${navigationMenu.render()}</div>`,
            },
        ],
        toolbarScrollable: true,
        contentScrolling: false,
    });
    await composer.init();

    navigationMenu.mount(root, { signal });

    root.addEventListener(
        "click",
        async (event) => {
            const viewButton = event.target.closest("[data-doc-view]");
            if (viewButton?.closest("#doc")) {
                await showDocument(activeSelection.slug, {
                    ...activeSelection,
                    view: viewButton.dataset.docView,
                    signal,
                });
                return;
            }
            const link = event.target.closest("a[href]");
            if (!link || !link.closest("#doc")) return;

            const href = link.getAttribute("href") || "";
            if (href.startsWith("http://") || href.startsWith("https://"))
                return;
            if (href.startsWith("/changelogs")) {
                event.preventDefault();
                await navigateTo(href);
                return;
            }

            if (link.matches("[data-doc-version]")) {
                event.preventDefault();
                await showDocument(activeSelection.slug, {
                    pushHistory: true,
                    signal,
                    version: link.dataset.docVersion,
                    view: activeSelection.view,
                });
                return;
            }

            if (
                href.startsWith("/") &&
                !href.startsWith("/docs/") &&
                !href.startsWith("/api/v1/docs/")
            )
                return;
            const slug = normalizeDocumentSlug(href);
            if (!slug) return;
            if (isChangelogSlug(slug)) {
                event.preventDefault();
                await navigateTo(changelogSlugToRoutePath(slug));
                return;
            }

            event.preventDefault();
            const target = parseDocumentsPath(`/docs/${slug}`);
            const explicitVersion = href.match(
                /\/docs\/(latest|\d+\.\d+\.\d+)\//,
            )?.[1];
            await showDocument(target.slug, {
                pushHistory: true,
                signal,
                view: target.view,
                version:
                    explicitVersion ??
                    (target.slug === activeSelection.slug
                        ? activeSelection.version
                        : "latest"),
            });
        },
        { signal },
    );

    window.addEventListener(
        "popstate",
        (event) => {
            const slug = event.state?.slug;
            if (slug) {
                showDocument(slug, {
                    pushHistory: false,
                    version: event.state?.version ?? "latest",
                    view: event.state?.view ?? "info",
                    signal,
                });
            } else {
                const route = parseDocumentsPath(window.location.pathname);
                const fallback = resolveDefaultSlug(
                    route.slug,
                    navigationDocuments,
                );
                if (fallback) {
                    showDocument(fallback, {
                        pushHistory: false,
                        version: route.version,
                        view: route.view,
                        signal,
                    });
                }
            }
        },
        { signal },
    );

    const initialRoute = parseDocumentsPath(window.location.pathname);
    const subpath = initialRoute.slug;
    const defaultDocument = resolveDefaultSlug(subpath, navigationDocuments);
    if (defaultDocument) {
        await showDocument(defaultDocument, {
            pushHistory: false,
            version: initialRoute.version,
            view: initialRoute.view,
            signal,
        });
    }
}

await mountWhenDirect(mount);
