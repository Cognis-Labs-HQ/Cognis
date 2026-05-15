import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";

async function loadAlphabetCharacters() {
    try {
        const response = await apiFetch(
            "/api/v1/study/languages/en/library/characters?characterClass=latin",
        );
        if (!response.ok) return [];
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        return rows
            .map((row) => ({
                id: row.id,
                symbol: row.symbol,
                romanization: row.romanization,
            }))
            .sort((leftRow, rightRow) => leftRow.id.localeCompare(rightRow.id));
    } catch {
        return [];
    }
}

function renderAlphabetGrid(characters) {
    return characters
        .map(
            (character) => `
        <div class="alphabet-cell" data-character-id="${escapeHtml(character.id)}">
            ${escapeHtml(character.symbol)}
        </div>
    `,
        )
        .join("");
}

export async function mount(root) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "ui.shared.brand.name");

    const currentPath = window.location.pathname;
    const [subNavigationModel, alphabetCharacters] = await Promise.all([
        loadStudySubNavigationModel({
            fallbackLanguageCode: "en",
        }),
        loadAlphabetCharacters(),
    ]);

    function renderSubNavigation() {
        return renderStudySubNavigation({
            model: subNavigationModel,
            currentPath,
            i18n,
        });
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
                        <p>The 26 Latin letters of the English alphabet. Data is sourced from the language library's characters layer.</p>
                        <div class="alphabet-grid">
                            ${renderAlphabetGrid(alphabetCharacters)}
                        </div>
                    </section>
                `,
            },
        ],
        preferenceKey: "study-en-alphabet-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.alphabet_page_title"),
            subtitle: i18n.t("gateway.study.alphabet_subtitle"),
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
