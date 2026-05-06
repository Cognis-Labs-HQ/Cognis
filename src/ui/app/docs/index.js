import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { createPageComposer } from "../../reuse/page-composer.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.docs");

async function loadDocsIndex() {
    const response = await apiFetch("/api/v1/docs");
    const payload = await response.json();
    return payload.data;
}

function toTitleCase(slug) {
    return slug
        .split("/")
        .pop()
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function normalizeDocSlug(href) {
    return href
        .replace(/^\.\//, "")
        .replace(/^\//, "")
        .replace(/^api\/v1\/docs\//, "")
        .replace(/\.md$/i, "");
}

function renderSidebarLinks(items) {
    return items
        .map(
            (item) =>
                `<li><button data-slug="${item.slug}">${toTitleCase(item.slug)}</button></li>`,
        )
        .join("");
}

async function showDoc(slug, pushHistory = true) {
    const response = await apiFetch(`/api/v1/docs/${slug}`);
    const payload = await response.json();
    root.querySelector("#doc").innerHTML = renderMarkdown(
        payload.data.markdown,
    );

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

const docs = await loadDocsIndex();

const elements = [
    {
        id: "doc-reader",
        label: i18n.t("ui.app.docs.page_title"),
        gridSize: { default: [4, 8], min: [2, 4], max: "full" },
        render: () => `<article id="doc" class="content-panel"></article>`,
    },
];

const composer = createPageComposer(root, {
    allowCustomization: false,
    elements,
    preferenceKey: "docs-layout",
    i18n,
    pageContext: {
        title: i18n.t("ui.app.docs.page_title"),
        subtitle: i18n.t("ui.app.docs.page_subtitle"),
    },
    toolbar: [
        {
            id: "docs-nav",
            label: i18n.t("ui.reuse.navigation"),
            render: () =>
                `<h3>${i18n.t("ui.reuse.navigation")}</h3><ul>${renderSidebarLinks(docs)}</ul>`,
        },
    ],
});
await composer.init();

function resolveDefaultSlug(subpath) {
    if (subpath && docs.find((doc) => doc.slug === subpath)) return subpath;
    return (
        docs.find((doc) => doc.slug === "docs/overview")?.slug ??
        docs.find((doc) => doc.slug.endsWith("/overview"))?.slug ??
        docs[0]?.slug
    );
}

root.querySelectorAll("[data-slug]").forEach((button) => {
    button.addEventListener("click", () => showDoc(button.dataset.slug));
});

root.addEventListener("click", async (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !link.closest("#doc")) return;

    const href = link.getAttribute("href") || "";
    if (href.startsWith("http://") || href.startsWith("https://")) return;

    const slug = normalizeDocSlug(href);
    if (!slug) return;

    event.preventDefault();
    await showDoc(slug);
});

window.addEventListener("popstate", (event) => {
    const slug = event.state?.slug;
    if (slug) {
        showDoc(slug, false);
    } else {
        const subpath = window.location.pathname.replace(/^\/docs\/?/, "");
        const fallback = resolveDefaultSlug(subpath);
        if (fallback) showDoc(fallback, false);
    }
});

const defaultDoc = (() => {
    const subpath = window.location.pathname.replace(/^\/docs\/?/, "");
    return resolveDefaultSlug(subpath);
})();
if (defaultDoc) await showDoc(defaultDoc, false);
