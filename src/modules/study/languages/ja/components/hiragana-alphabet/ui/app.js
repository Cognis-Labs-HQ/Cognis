import { renderDashboardLayout } from "/static/layouts/dashboard-layout.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.shared.brand.name");

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

async function loadHiraganaCharacters() {
    try {
        const response = await apiFetch(
            "/api/v1/study/languages/ja/library/characters?characterClass=hiragana",
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

function chunkRows(rows, chunkSize) {
    const chunks = [];
    for (let index = 0; index < rows.length; index += chunkSize) {
        chunks.push(rows.slice(index, index + chunkSize));
    }
    return chunks;
}

function renderCharacterGrid(characters) {
    const rows = chunkRows(characters, 5);
    return rows
        .map(
            (row) => `
    <div class="hiragana-row">
      ${row
          .map(
              (character) => `
        <div class="hiragana-cell" data-character-id="${escapeHtml(character.id)}">
          <span class="hiragana-symbol">${escapeHtml(character.symbol)}</span>
          <span class="hiragana-romanization">${escapeHtml(character.romanization)}</span>
        </div>
      `,
          )
          .join("")}
    </div>
  `,
        )
        .join("");
}

const [subNavComponents, hiraganaCharacters] = await Promise.all([
    loadSubNav("ja"),
    loadHiraganaCharacters(),
]);

const subNavHtml =
    subNavComponents.length > 0
        ? `
    <nav class="study-subnav">
      ${subNavComponents
          .map(
              (component) => `
        <a
          class="study-subnav-link${component.pageUrl === "/study/ja/hiragana" ? " study-subnav-link--active" : ""}"
          href="${escapeHtml(component.pageUrl)}"
        >${escapeHtml(component.label)}</a>
      `,
          )
          .join("")}
    </nav>
  `
        : "";

await renderDashboardLayout(document.querySelector("#app"), {
    pageContext: "<h1>&#x1F1EF;&#x1F1F5; Hiragana Alphabet</h1>",
    content: `
        <div class="study-language-page">
            ${subNavHtml}
            <section class="hiragana-alphabet-section">
                <h2>ひらがな — Hiragana</h2>
                <p>The basic phonetic syllabary of Japanese. Data is sourced from the language library's characters layer.</p>
                <div class="hiragana-grid">
                    ${renderCharacterGrid(hiraganaCharacters)}
                </div>
            </section>
        </div>
    `,
    i18n,
});
