import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";

const ENGLISH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

    const currentPath = window.location.pathname;
    const subNavigationModel = await loadStudySubNavigationModel({
        fallbackLanguageCode: "en",
    });

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
