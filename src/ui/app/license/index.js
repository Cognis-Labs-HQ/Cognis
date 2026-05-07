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

function createSection(sections, title, lines) {
    const base = sectionId(title);
    let id = base;
    let suffix = 2;
    while (sections.some((section) => section.id === id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }
    return { id, title, lines };
}

function parseSections(markdown) {
    const lines = markdown.split("\n");
    const sections = [];
    let current = null;
    let currentTermsClause = null;

    function flushCurrent() {
        if (!current) return;
        if (current.splitClauses) {
            if (
                Array.isArray(current.introLines) &&
                current.introLines.some((line) => line.trim().length > 0)
            ) {
                sections.push(
                    createSection(sections, current.title, current.introLines),
                );
            }
            if (currentTermsClause) {
                sections.push(
                    createSection(
                        sections,
                        currentTermsClause.title,
                        currentTermsClause.lines,
                    ),
                );
                currentTermsClause = null;
            }
        } else {
            sections.push(
                createSection(sections, current.title, current.lines),
            );
        }
        current = null;
    }

    for (const line of lines) {
        if (line.startsWith("## ")) {
            flushCurrent();
            const title = line.slice(3).trim();
            current = { title, splitClauses: false, lines: [] };
            continue;
        }

        if (current && line.startsWith("### ")) {
            if (!current.splitClauses) {
                current.splitClauses = true;
                current.introLines = current.lines;
                current.lines = undefined;
            }
            if (currentTermsClause) {
                sections.push(
                    createSection(
                        sections,
                        currentTermsClause.title,
                        currentTermsClause.lines,
                    ),
                );
            }
            const title = line.slice(4).trim();
            currentTermsClause = { title, lines: [] };
            continue;
        }

        if (current?.splitClauses) {
            if (currentTermsClause) {
                currentTermsClause.lines.push(line);
            } else {
                current.introLines.push(line);
            }
        } else if (current) {
            current.lines.push(line);
        }
    }
    flushCurrent();
    return sections;
}

let sections = [];
let loadError = false;

function renderSections() {
    const container = root.querySelector("#license-sections");
    if (!container) return;
    if (loadError) {
        container.innerHTML = `<p class="license-load-error">${i18n.t("ui.app.license.load_error")}</p>`;
        return;
    }
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
} else {
    loadError = true;
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
    const details = document.getElementById(id);
    if (!details) return;
    details.open = true;
    root.querySelectorAll("[data-section-id]").forEach((b) => {
        b.classList.toggle("active", b.dataset.sectionId === id);
    });
    requestAnimationFrame(() => {
        details.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
