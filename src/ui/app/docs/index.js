import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
} from "../../reuse/i18n.js";
import { loadMarkdownDocumentHtml } from "../../reuse/markdown-document.js";
import { createPageComposer } from "../../reuse/page-composer.js";

const DOCUMENT_HEADING_SELECTOR = "h1,h2,h3";
const DOCUMENT_HEADING_CLASS = "docs-truncated-heading";

const GROUP_KEYS = {
    "": "ui.app.docs.group.platform",
    gateways: "ui.app.docs.group.gateways",
    "adapters/auth": "ui.app.docs.group.adapters_auth",
    "adapters/db": "ui.app.docs.group.adapters_db",
    "adapters/file": "ui.app.docs.group.adapters_file",
    "adapters/notify": "ui.app.docs.group.adapters_notify",
    modules: "ui.reuse.modules",
    tooling: "ui.app.docs.group.tooling",
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
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
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
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
    );
}

function renderDocNavButton(item) {
    const title = docTitle(item);
    const safeTitle = escapeHtml(title);
    return `
        <li>
            <button class="docs-nav-link" data-slug="${item.slug}" title="${safeTitle}">
                <span class="docs-nav-label">${safeTitle}</span>
            </button>
        </li>
    `;
}

function normalizeDocSlug(href) {
    return href
        .replace(/[?#].*$/, "")
        .replace(/^\.\//, "")
        .replace(/^\//, "")
        .replace(/^docs\/?/, "")
        .replace(/^api\/v1\/docs\/?/, "")
        .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
        .replace(/\.md$/i, "");
}

function buildGroupedNav(i18n, items) {
    const groups = new Map();
    for (const item of items) {
        const groupKey = item.group ?? "";
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
    }

    let html = "";
    for (const [group, groupItems] of groups) {
        const label = groupLabel(i18n, group);
        const links = groupItems
            .map((item) => renderDocNavButton(item))
            .join("");

        if (group === "") {
            html += `<ul class="docs-nav-group docs-nav-top">${links}</ul>`;
        } else {
            const storageKey = `docs-group-open:${group}`;
            const isOpen = localStorage.getItem(storageKey) !== "false";
            html += `<details class="docs-nav-group" ${isOpen ? "open" : ""} data-nav-group="${group}">`;
            html += `<summary>${label}</summary>`;
            html += `<ul>${links}</ul>`;
            html += `</details>`;
        }
    }
    return html;
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.docs");

    let activeHtml = null;

    function renderActiveDoc() {
        const docEl = root.querySelector("#doc");
        if (!docEl || activeHtml === null) return;
        docEl.innerHTML = activeHtml;
        docEl.querySelectorAll(DOCUMENT_HEADING_SELECTOR).forEach((heading) => {
            heading.classList.add(DOCUMENT_HEADING_CLASS);
            const headingText = heading.textContent?.trim() ?? "";
            const isVisuallyTruncated =
                heading.scrollWidth > heading.clientWidth;
            if (headingText && isVisuallyTruncated) {
                heading.setAttribute("title", headingText);
            }
        });
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
        // If the page was navigated away from while the fetch was in flight,
        // bail out before touching the DOM or history (fall through to nothing).
        if (signal?.aborted) return;
        renderActiveDoc();

        if (pushHistory) {
            window.history.pushState({ slug }, "", `/docs/${slug}`);
        } else {
            window.history.replaceState({ slug }, "", `/docs/${slug}`);
        }

        root.querySelectorAll("[data-slug]").forEach((button) => {
            const isActive = button.dataset.slug === slug;
            button.classList.toggle("active", isActive);
            if (isActive) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
    }

    function resolveDefaultSlug(subpath, docs) {
        if (subpath && docs.find((doc) => doc.slug === subpath)) return subpath;
        return (
            docs.find((doc) => doc.slug === "overview")?.slug ??
            docs.find((doc) => doc.slug === "index")?.slug ??
            docs[0]?.slug
        );
    }

    const docs = await loadDocsIndex();

    const elements = [
        {
            id: "doc-reader",
            label: i18n.t("ui.reuse.docs"),
            gridSize: { default: [4, 8], min: [2, 4], max: "full" },
            render: () => `<article id="doc" class="content-panel"></article>`,
        },
    ];

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "docs-layout",
        i18n,
        onRender: renderActiveDoc,
        pageContext: {
            title: i18n.t("ui.reuse.docs"),
            subtitle: i18n.t("ui.app.docs.page_subtitle"),
        },
        toolbar: [
            {
                id: "docs-nav",
                label: i18n.t("ui.reuse.navigation"),
                render: () =>
                    `<h3>${i18n.t("ui.reuse.navigation")}</h3><nav class="docs-nav">${buildGroupedNav(i18n, docs)}</nav>`,
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
            const key = `docs-group-open:${details.dataset.navGroup}`;
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

            const slug = normalizeDocSlug(href);
            if (!slug) return;

            event.preventDefault();
            await showDoc(slug, { pushHistory: true, signal });
        },
        { signal },
    );

    window.addEventListener(
        "popstate",
        (event) => {
            const slug = event.state?.slug;
            if (slug) {
                showDoc(slug, { pushHistory: false });
            } else {
                const subpath = window.location.pathname.replace(
                    /^\/docs\/?/,
                    "",
                );
                const fallback = resolveDefaultSlug(subpath, docs);
                if (fallback) showDoc(fallback, { pushHistory: false });
            }
        },
        { signal },
    );

    const defaultDoc = (() => {
        const subpath = window.location.pathname.replace(/^\/docs\/?/, "");
        return resolveDefaultSlug(subpath, docs);
    })();
    if (defaultDoc) await showDoc(defaultDoc, { pushHistory: false });
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
