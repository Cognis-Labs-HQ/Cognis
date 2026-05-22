import { escapeHtml } from "/static/reuse/escape-html.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { mountStudyAlphabetPage } from "/static/modules/study/languages/reuse/alphabet-page.js";

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
    await mountStudyAlphabetPage(root, {
        languageCode: "en",
        fallbackLanguageCode: "en",
        characterClass: "latin",
        pageElementId: "study-en-alphabet",
        pageLabel: "Alphabet",
        preferenceKey: "study-en-alphabet-layout",
        pageTitleKey: "gateway.study.alphabet_page_title",
        pageSubtitleKey: "gateway.study.alphabet_subtitle",
        renderSection: ({ alphabetCharacters }) => `
                    <section class="english-alphabet-section">
                        <h2>English Alphabet</h2>
                        <p>The 26 Latin letters of the English alphabet. Data is sourced from the language library's characters layer.</p>
                        <div class="alphabet-grid">
                            ${renderAlphabetGrid(alphabetCharacters)}
                        </div>
                    </section>
                `,
    });
}
await mountWhenDirect(mount).catch((error) =>
    console.error("[study-en] alphabet mount failed", error),
);
