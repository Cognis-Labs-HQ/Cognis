import { loadDocsIndex } from "../../reuse/docs-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
} from "../../reuse/i18n.js";
import { loadMarkdownDocumentHtml } from "../../reuse/markdown-document.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { navigateTo } from "../../reuse/app-router.js";
import { linkShortCommitRefs } from "../../reuse/commit-links.js";
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

function docTitle(item) {
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

function normalizeDocSlug(href) {
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

function isChangelogDoc(item) {
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
            label: docTitle(item),
        })),
    }));
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.changelogs");

    let activeHtml = null;

    function renderActiveDoc() {
        const docEl = root.querySelector("#doc");
        if (!docEl || activeHtml === null) return;
        docEl.innerHTML = activeHtml;
    }

    async function showDoc(slug, { pushHistory = true, signal } = {}) {
        const langs = readPreferredLanguages().join(",");
        try {
            activeHtml = await loadMarkdownDocumentHtml(
                `/api/v1/docs/${slug}?langs=${encodeURIComponent(langs)}`,
                { transformMarkdown: linkShortCommitRefs },
            );
        } catch {
            return;
        }
        if (signal?.aborted) return;
        renderActiveDoc();

        const historyPath = changelogSlugToRoutePath(slug);
        if (pushHistory) {
            window.history.pushState({ slug }, "", historyPath);
        } else {
            window.history.replaceState({ slug }, "", historyPath);
        }

        navigationMenu.setActive(slug);
    }

    function resolveDefaultSlug(subpath, selectableDocs) {
        const mappedSlug = changelogRouteSubpathToSlug(subpath);
        if (
            mappedSlug &&
            selectableDocs.find((doc) => doc.slug === mappedSlug)
        ) {
            return mappedSlug;
        }
        return (
            selectableDocs.find((doc) => doc.slug === "changelog")?.slug ??
            selectableDocs.find((doc) => doc.slug === "changelog/index")
                ?.slug ??
            selectableDocs[0]?.slug
        );
    }

    const docs = await loadDocsIndex();
    const changelogDocs = docs.filter((doc) => isChangelogDoc(doc));
    const navigationMenu = createSideMenu({
        groups: createNavigationGroups(i18n, changelogDocs),
        storageKeyPrefix: "changelogs-group-open",
        onSelect: (slug) => showDoc(slug, { signal }),
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
        allowCustomization: false,
        elements,
        preferenceKey: "changelogs-layout",
        i18n,
        onRender: renderActiveDoc,
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

            const normalizedSlug = normalizeDocSlug(href);
            if (!normalizedSlug) return;
            const slug = changelogRouteSubpathToSlug(normalizedSlug);
            if (!changelogDocs.find((doc) => doc.slug === slug)) {
                event.preventDefault();
                await navigateTo(`/docs/${normalizedSlug}`);
                return;
            }

            event.preventDefault();
            await showDoc(slug, { pushHistory: true, signal });
        },
        { signal },
    );

    window.addEventListener(
        "popstate",
        (event) => {
            const slug = event.state?.slug;
            if (slug && changelogDocs.find((doc) => doc.slug === slug)) {
                showDoc(slug, { pushHistory: false });
            } else {
                const subpath = window.location.pathname.replace(
                    /^\/changelogs\/?/,
                    "",
                );
                const fallback = resolveDefaultSlug(subpath, changelogDocs);
                if (fallback) showDoc(fallback, { pushHistory: false });
            }
        },
        { signal },
    );

    const defaultDoc = (() => {
        const subpath = window.location.pathname.replace(
            /^\/changelogs\/?/,
            "",
        );
        return resolveDefaultSlug(subpath, changelogDocs);
    })();
    if (defaultDoc) await showDoc(defaultDoc, { pushHistory: false });
}

await mountWhenDirect(mount);
