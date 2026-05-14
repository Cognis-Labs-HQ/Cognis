import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer.js";

const ENGLISH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

async function loadSubNav(languageCode) {
    try {
        const response = await apiFetch(
            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
        );
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    } catch {
        return [];
    }
}

function renderAlphabetGrid() {
    return ENGLISH_ALPHABET.map(
        (letter) => `
        <div class="alphabet-cell">${escapeHtml(letter)}</div>
    `,
    ).join("");
}

export async function mount(root) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.shared.brand.name");

    const subNavComponents = await loadSubNav("en");

    function renderSubNavigation() {
        return `
            <ul class="page-subnav-list study-subnav">
                ${subNavComponents
                    .map(
                        (component) => `
                    <li>
                        <a
                            class="study-subnav-link${component.pageUrl === "/study/english-alphabet" ? " active" : ""}"
                            href="${escapeHtml(component.pageUrl)}"
                        >${escapeHtml(component.label)}</a>
                    </li>
                `,
                    )
                    .join("")}
            </ul>
        `;
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "study-en-alphabet",
                label: "Alphabet",
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                    <section class="english-alphabet-section">
                        <h2>English Alphabet</h2>
                        <p>A simple page for testing Study language switching between modules.</p>
                        <div class="alphabet-grid">
                            ${renderAlphabetGrid()}
                        </div>
                    </section>
                `,
            },
        ],
        preferenceKey: "study-en-alphabet-layout",
        i18n,
        pageContext: {
            title: "English Alphabet",
        },
        toolbar: [],
        subNavigation: [
            {
                id: "study-en-alphabet-subnav",
                label: "Study",
                render: renderSubNavigation,
            },
        ],
    });

    await composer.init();
}

if (!globalThis.__spaRouter) {
    try {
        await mount(document.querySelector("#app"));
    } catch (error) {
        console.error("[study-en] alphabet mount failed", error);
    }
}
