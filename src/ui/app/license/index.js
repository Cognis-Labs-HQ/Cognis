import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";

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

export async function mount(root) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.license");

    let sections = [];
    let activeSectionId = null;
    let loadError = false;

    function renderSections() {
        const container = root.querySelector("#license-sections");
        if (!container) return;
        if (loadError) {
            container.innerHTML = `<p class="license-load-error">${i18n.t("ui.app.license.load_error")}</p>`;
            return;
        }
        if (sections.length === 0) {
            container.innerHTML = "";
            return;
        }
        const section =
            sections.find((s) => s.id === activeSectionId) ?? sections[0];
        container.innerHTML =
            `<h2 class="license-section-title">${section.title}</h2>` +
            `<div class="license-section-body">${renderMarkdown(section.lines.join("\n"))}</div>`;
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
        toolbarScrollable: true,
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
        activeSectionId = sections[0].id;
        const items = sections
            .map(
                (s) =>
                    `<li><button data-section-id="${s.id}">${s.title}</button></li>`,
            )
            .join("");
        nav.innerHTML = `<ul>${items}</ul>`;
        nav.querySelector(
            `[data-section-id="${activeSectionId}"]`,
        )?.classList.add("active");
    }

    renderSections();

    root.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-section-id]");
        if (!btn) return;
        activeSectionId = btn.dataset.sectionId;
        root.querySelectorAll("[data-section-id]").forEach((b) => {
            b.classList.toggle(
                "active",
                b.dataset.sectionId === activeSectionId,
            );
        });
        renderSections();
    });
}

await mountWhenDirect(mount);
