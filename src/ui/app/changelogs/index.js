import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
} from "../../reuse/i18n.js";
import { loadMarkdownDocumentHtml } from "../../reuse/markdown-document.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { navigateTo } from "../../reuse/app-router.js";

const GROUP_KEYS = {
    changelog: "ui.app.changelogs.group.changelogs",
};

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function groupLabel(i18n, group) {
    const key = GROUP_KEYS[group];
    if (key) return i18n.t(key);
    return group
        .split("/")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" › ");
}

async function loadDocsIndex() {
    const response = await apiFetch("/api/v1/docs");
    const payload = await response.json();
    return payload.data;
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

function renderDocNavButton(item) {
    const title = docTitle(item);
    const safeTitle = escapeHtml(title);
    return `
        <li>
            <button class="docs-nav-link" data-slug="${item.slug}">${safeTitle}</button>
        </li>
    `;
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
    return `/docs/${slug}`;
}

function changelogRouteSubpathToSlug(subpath) {
    if (!subpath) return "changelog";
    if (subpath === "changelog" || subpath.startsWith("changelog/")) {
        return subpath;
    }
    return `changelog/${subpath}`;
}

function buildGroupedNav(i18n, items) {
    const groups = new Map();
    for (const item of items) {
        const groupKey =
            item.group === "changelog" || item.group === "changelogs"
                ? "changelog"
                : item.group || "changelog";
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
    }

    let html = "";
    for (const [group, groupItems] of groups) {
        const label = groupLabel(i18n, group);
        const links = groupItems
            .map((item) => renderDocNavButton(item))
            .join("");
        const storageKey = `changelogs-group-open:${group}`;
        const isOpen = localStorage.getItem(storageKey) !== "false";
        html += `<details class="docs-nav-group" ${isOpen ? "open" : ""} data-nav-group="${group}">`;
        html += `<summary>${label}</summary>`;
        html += `<ul>${links}</ul>`;
        html += `</details>`;
    }
    return html;
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

        root.querySelectorAll("[data-slug]").forEach((button) => {
            const isActive = button.dataset.slug === slug;
            button.classList.toggle("active", isActive);
            if (isActive) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
    }

    function resolveDefaultSlug(subpath, selectableDocs) {
        const mappedSlug = changelogRouteSubpathToSlug(subpath);
        if (mappedSlug && selectableDocs.find((doc) => doc.slug === mappedSlug)) {
            return mappedSlug;
        }
        return (
            selectableDocs.find((doc) => doc.slug === "changelog")?.slug ??
            selectableDocs.find((doc) => doc.slug === "changelog/index")?.slug ??
            selectableDocs[0]?.slug
        );
    }

    const docs = await loadDocsIndex();
    const changelogDocs = docs.filter((doc) => isChangelogDoc(doc));

    const elements = [
        {
            id: "changelog-reader",
            label: i18n.t("ui.layout.footer.changelogs"),
            gridSize: { default: [4, 8], min: [2, 4], max: "full" },
            render: () => `<article id="doc" class="content-panel"></article>`,
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
                    `<h3>${i18n.t("ui.reuse.navigation")}</h3><nav class="docs-nav">${buildGroupedNav(i18n, changelogDocs)}</nav>`,
            },
        ],
        toolbarScrollable: true,
    });
    await composer.init();

    root.querySelectorAll("[data-slug]").forEach((button) => {
        button.addEventListener("click", () => showDoc(button.dataset.slug));
    });

    root.querySelectorAll("details[data-nav-group]").forEach((details) => {
        details.addEventListener("toggle", () => {
            const key = `changelogs-group-open:${details.dataset.navGroup}`;
            localStorage.setItem(key, details.open ? "true" : "false");
        });
    });

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
        const subpath = window.location.pathname.replace(/^\/changelogs\/?/, "");
        return resolveDefaultSlug(subpath, changelogDocs);
    })();
    if (defaultDoc) await showDoc(defaultDoc, { pushHistory: false });
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
