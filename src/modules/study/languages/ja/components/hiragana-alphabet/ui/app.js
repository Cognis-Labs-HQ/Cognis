import { renderDashboardLayout } from "/static/layouts/dashboard-layout.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.shared.brand.name");

const HIRAGANA_ROWS = [
    [
        { symbol: "あ", romanization: "a" },
        { symbol: "い", romanization: "i" },
        { symbol: "う", romanization: "u" },
        { symbol: "え", romanization: "e" },
        { symbol: "お", romanization: "o" },
    ],
    [
        { symbol: "か", romanization: "ka" },
        { symbol: "き", romanization: "ki" },
        { symbol: "く", romanization: "ku" },
        { symbol: "け", romanization: "ke" },
        { symbol: "こ", romanization: "ko" },
    ],
    [
        { symbol: "さ", romanization: "sa" },
        { symbol: "し", romanization: "shi" },
        { symbol: "す", romanization: "su" },
        { symbol: "せ", romanization: "se" },
        { symbol: "そ", romanization: "so" },
    ],
    [
        { symbol: "た", romanization: "ta" },
        { symbol: "ち", romanization: "chi" },
        { symbol: "つ", romanization: "tsu" },
        { symbol: "て", romanization: "te" },
        { symbol: "と", romanization: "to" },
    ],
    [
        { symbol: "な", romanization: "na" },
        { symbol: "に", romanization: "ni" },
        { symbol: "ぬ", romanization: "nu" },
        { symbol: "ね", romanization: "ne" },
        { symbol: "の", romanization: "no" },
    ],
    [
        { symbol: "は", romanization: "ha" },
        { symbol: "ひ", romanization: "hi" },
        { symbol: "ふ", romanization: "fu" },
        { symbol: "へ", romanization: "he" },
        { symbol: "ほ", romanization: "ho" },
    ],
    [
        { symbol: "ま", romanization: "ma" },
        { symbol: "み", romanization: "mi" },
        { symbol: "む", romanization: "mu" },
        { symbol: "め", romanization: "me" },
        { symbol: "も", romanization: "mo" },
    ],
    [
        { symbol: "や", romanization: "ya" },
        { symbol: "ゆ", romanization: "yu" },
        { symbol: "よ", romanization: "yo" },
    ],
    [
        { symbol: "ら", romanization: "ra" },
        { symbol: "り", romanization: "ri" },
        { symbol: "る", romanization: "ru" },
        { symbol: "れ", romanization: "re" },
        { symbol: "ろ", romanization: "ro" },
    ],
    [
        { symbol: "わ", romanization: "wa" },
        { symbol: "を", romanization: "wo" },
    ],
    [{ symbol: "ん", romanization: "n" }],
];

function renderCharacterGrid() {
    return HIRAGANA_ROWS.map(
        (row) => `
    <div class="hiragana-row">
      ${row
          .map(
              (character) => `
        <div class="hiragana-cell">
          <span class="hiragana-symbol">${escapeHtml(character.symbol)}</span>
          <span class="hiragana-romanization">${escapeHtml(character.romanization)}</span>
        </div>
      `,
          )
          .join("")}
    </div>
  `,
    ).join("");
}

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

const subNavComponents = await loadSubNav("ja");

const subNavHtml =
    subNavComponents.length > 1
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
                <p>The basic phonetic syllabary of Japanese. Each symbol represents one mora (syllable unit).</p>
                <div class="hiragana-grid">
                    ${renderCharacterGrid()}
                </div>
            </section>
        </div>
    `,
    i18n,
});

document.querySelectorAll(".study-subnav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && globalThis.__spaRouter) {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = href;
        });
    }
});
