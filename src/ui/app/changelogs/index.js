import { guides } from "./guides.js";
import {
    loadDocumentsIndex,
    readDocumentsLanguages,
} from "../../reuse/docs-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { loadMarkdownDocumentHtml } from "../../reuse/markdown-document.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { navigateTo } from "../../reuse/app-router.js";
import { linkShortCommitReferences } from "../../reuse/commit-links.js";
import { createSideMenu } from "../../reuse/side-menu.js";

const CHANGELOG_GROUP_KEY = "changelog";

const GROUP_KEYS = {
    [CHANGELOG_GROUP_KEY]: "ui.app.changelogs.group.changelogs",
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

function normalizeDocumentSlug(href) {
    return href
        .replace(/[?#].*$/, "")
        .replace(/^\.\//, "")
        .replace(/^\//, "")
        .replace(/^changelogs\/?/, "")
        .replace(/^docs\/?/, "")
        .replace(/^api\/v1\/docs\/?/, "")
        .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
        .replace(/\.md$/i, "");
}

function isChangelogDocument(item) {
    return item.slug === "changelog" || item.slug.startsWith("changelog/");
}

function changelogSlugToRoutePath(slug) {
    if (slug === "changelog") return "/changelogs";
    if (slug.startsWith("changelog/")) {
        return `/changelogs/${slug.slice("changelog/".length)}`;
    }
    return "/changelogs";
}

function changelogRouteSubpathToSlug(subpath) {
    if (!subpath) return "changelog";
    if (subpath === "changelog" || subpath.startsWith("changelog/")) {
        return subpath;
    }
    return `changelog/${subpath}`;
}

function createNavigationGroups(i18n, items) {
    const groups = new Map();
    for (const item of items) {
        const groupKey = item.sourceName || CHANGELOG_GROUP_KEY;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
    }

    return Array.from(groups, ([group, groupItems]) => ({
        id: group,
        label: group === CHANGELOG_GROUP_KEY ? groupLabel(i18n, group) : group,
        items: groupItems.map((item) => ({
            id: item.slug,
            label: documentTitle(item),
        })),
    }));
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.changelogs");

    let activeHtml = null;

    function renderActiveDocument() {
        const documentElement = root.querySelector("#doc");
        if (!documentElement || activeHtml === null) return;
        documentElement.innerHTML = activeHtml;
    }

    async function showDocument(slug, { pushHistory = true, signal } = {}) {
        const languages = readDocumentsLanguages().join(",");
        try {
            activeHtml = await loadMarkdownDocumentHtml(
                `/api/v1/docs/${slug}?langs=${encodeURIComponent(languages)}`,
                { transformMarkdown: linkShortCommitReferences },
            );
        } catch {
            return;
        }
        if (signal?.aborted) return;
        renderActiveDocument();

        const historyPath = changelogSlugToRoutePath(slug);
        if (pushHistory) {
            window.history.pushState({ slug }, "", historyPath);
        } else {
            window.history.replaceState({ slug }, "", historyPath);
        }

        navigationMenu.setActive(slug);
    }

    function resolveDefaultSlug(subpath, selectableDocuments) {
        const mappedSlug = changelogRouteSubpathToSlug(subpath);
        if (
            mappedSlug &&
            selectableDocuments.find((document) => document.slug === mappedSlug)
        ) {
            return mappedSlug;
        }
        return (
            selectableDocuments.find(
                (document) => document.slug === "changelog",
            )?.slug ??
            selectableDocuments.find(
                (document) => document.slug === "changelog/index",
            )?.slug ??
            selectableDocuments[0]?.slug
        );
    }

    const docs = await loadDocumentsIndex();
    const changelogDocuments = docs.filter((document) =>
        isChangelogDocument(document),
    );
    const navigationMenu = createSideMenu({
        groups: createNavigationGroups(i18n, changelogDocuments),
        storageKeyPrefix: "changelogs-group-open",
        onSelect: (slug) => showDocument(slug, { signal }),
    });

    const elements = [
        {
            id: "changelog-reader",
            label: i18n.t("ui.layout.footer.changelogs"),
            gridSize: { default: [4, 8], min: [2, 4], max: "full" },
            render: () =>
                `<article id="doc" class="content-panel changelog-content-panel"></article>`,
        },
    ];

    const composer = createPageComposer(root, {
        tutorials: guides,
        allowCustomization: false,
        elements,
        preferenceKey: "changelogs-layout",
        i18n,
        onRender: renderActiveDocument,
        pageContext: {
            title: i18n.t("ui.app.changelogs.page_title"),
            subtitle: i18n.t("ui.app.changelogs.page_subtitle"),
        },
        toolbar: [
            {
                id: "changelogs-nav",
                label: i18n.t("ui.reuse.navigation"),
                render: () =>
                    `<h3>${i18n.t("ui.reuse.navigation")}</h3>${navigationMenu.render()}`,
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
            const link = event.target.closest("a[href]");
            if (!link || !link.closest("#doc")) return;

            const href = link.getAttribute("href") || "";
            if (href.startsWith("http://") || href.startsWith("https://"))
                return;
            if (href.startsWith("/docs")) {
                event.preventDefault();
                await navigateTo(href);
                return;
            }

            const normalizedSlug = normalizeDocumentSlug(href);
            if (!normalizedSlug) return;
            const slug = changelogRouteSubpathToSlug(normalizedSlug);
            if (
                !changelogDocuments.find((document) => document.slug === slug)
            ) {
                event.preventDefault();
                await navigateTo(`/docs/${normalizedSlug}`);
                return;
            }

            event.preventDefault();
            await showDocument(slug, { pushHistory: true, signal });
        },
        { signal },
    );

    window.addEventListener(
        "popstate",
        (event) => {
            const slug = event.state?.slug;
            if (
                slug &&
                changelogDocuments.find((document) => document.slug === slug)
            ) {
                showDocument(slug, { pushHistory: false });
            } else {
                const subpath = window.location.pathname.replace(
                    /^\/changelogs\/?/,
                    "",
                );
                const fallback = resolveDefaultSlug(
                    subpath,
                    changelogDocuments,
                );
                if (fallback) showDocument(fallback, { pushHistory: false });
            }
        },
        { signal },
    );

    const defaultDocument = (() => {
        const subpath = window.location.pathname.replace(
            /^\/changelogs\/?/,
            "",
        );
        return resolveDefaultSlug(subpath, changelogDocuments);
    })();
    if (defaultDocument)
        await showDocument(defaultDocument, { pushHistory: false });
}

await mountWhenDirect(mount);
