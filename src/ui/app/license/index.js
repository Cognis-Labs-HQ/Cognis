import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { createPageComposer } from "../../reuse/page-composer.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.license");

function sectionId(title) {
    return (
        "license-section-" +
        title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
    );
}

function parseSections(markdown) {
    const lines = markdown.split("\n");
    const sections = [];
    let current = null;
    for (const line of lines) {
        if (line.startsWith("## ")) {
            if (current) sections.push(current);
            const title = line.slice(3).trim();
            current = { id: sectionId(title), title, lines: [] };
        } else if (current) {
            current.lines.push(line);
        }
    }
    if (current) sections.push(current);
    return sections;
}

let sections = [];

function renderSections() {
    const container = root.querySelector("#license-sections");
    if (!container) return;
    container.innerHTML = sections
        .map((s, idx) => {
            const body = renderMarkdown(s.lines.join("\n"));
            const open = idx === 0 ? " open" : "";
            return (
                `<details class="license-section" id="${s.id}"${open}>` +
                `<summary>${s.title}</summary>` +
                `<div class="license-section-body">${body}</div>` +
                `</details>`
            );
        })
        .join("");
}

const elements = [
    {
        id: "license-reader",
        label: i18n.t("ui.app.license.page_title"),
        gridSize: { default: [4, 8], min: [2, 4], max: "full" },
        render: () =>
            `<div id="license-sections" class="license-sections"></div>`,
    },
];

const composer = createPageComposer(root, {
    allowCustomization: false,
    elements,
    preferenceKey: "license-layout",
    i18n,
    onRender: renderSections,
    pageContext: {
        title: i18n.t("ui.app.license.page_title"),
        subtitle: i18n.t("ui.app.license.page_subtitle"),
    },
    toolbar: [
        {
            id: "license-nav",
            label: i18n.t("ui.reuse.navigation"),
            render: () =>
                `<h3>${i18n.t("ui.reuse.navigation")}</h3><nav class="license-nav"></nav>`,
        },
    ],
});
await composer.init();

const response = await apiFetch("/api/v1/system/license");
if (response.ok) {
    const payload = await response.json();
    sections = parseSections(payload?.data?.markdown ?? "");
}

const nav = root.querySelector(".license-nav");
if (nav && sections.length > 0) {
    const items = sections
        .map(
            (s) =>
                `<li><button data-section-id="${s.id}">${s.title}</button></li>`,
        )
        .join("");
    nav.innerHTML = `<ul>${items}</ul>`;
}

renderSections();

root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-section-id]");
    if (!btn) return;
    const id = btn.dataset.sectionId;
    const details = root.querySelector(`details#${id}`);
    if (!details) return;
    details.open = true;
    root.querySelectorAll("[data-section-id]").forEach((b) => {
        b.classList.toggle("active", b.dataset.sectionId === id);
    });
    requestAnimationFrame(() => {
        details.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
