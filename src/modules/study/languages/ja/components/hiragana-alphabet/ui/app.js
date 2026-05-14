import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer.js";

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

export async function mount(root) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.shared.brand.name");

    const [subNavComponents, hiraganaCharacters] = await Promise.all([
        loadSubNav("ja"),
        loadHiraganaCharacters(),
    ]);

    function renderSubNavigation() {
        return `
            <ul class="page-subnav-list study-subnav">
                ${subNavComponents
                    .map(
                        (component) => `
                    <li>
                        <a
                            class="study-subnav-link${component.pageUrl === "/study/hiragana" ? " study-subnav-link--active" : ""}"
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
                id: "study-ja-hiragana",
                label: "Hiragana Alphabet",
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                    <section class="hiragana-alphabet-section">
                        <h2>ひらがな — Hiragana</h2>
                        <p>The basic phonetic syllabary of Japanese. Data is sourced from the language library's characters layer.</p>
                        <div class="hiragana-grid">
                            ${renderCharacterGrid(hiraganaCharacters)}
                        </div>
                    </section>
                `,
            },
        ],
        preferenceKey: "study-ja-hiragana-layout",
        i18n,
        pageContext: {
            title: "Hiragana Alphabet",
        },
        toolbar: [],
        subNavigation: [
            {
                id: "study-ja-hiragana-subnav",
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
        console.error("[study-ja] hiragana mount failed", error);
    }
}
