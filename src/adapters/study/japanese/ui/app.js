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

const subNavComponents = await loadSubNav("ja");

const subNavHtml =
    subNavComponents.length > 0
        ? `
    <nav class="study-subnav">
      ${subNavComponents
          .map(
              (component) => `
        <a class="study-subnav-link" href="${escapeHtml(component.pageUrl)}">${escapeHtml(component.label)}</a>
      `,
          )
          .join("")}
    </nav>
  `
        : "";

await renderDashboardLayout(document.querySelector("#app"), {
    pageContext: "<h1>Japanese &#x1F1EF;&#x1F1F5;</h1>",
    content: `
        <div class="japanese-study-page">
            ${subNavHtml}
            <h2>&#12402;&#12425;&#12364;&#12394; Hiragana</h2>
            <p>Basic phonetic syllabary used in Japanese writing.</p>
            <h2>&#12459;&#12479;&#12459;&#12490; Katakana</h2>
            <p>Syllabary used for foreign loanwords and emphasis.</p>
            <h2>&#21333;&#35486; Vocabulary</h2>
            <p>Curated word lists for everyday communication.</p>
            <h2>&#25991;&#27861; Grammar</h2>
            <p>Japanese sentence patterns and grammatical structures.</p>
            <h2>&#28450;&#23383; Kanji</h2>
            <p>Chinese-origin characters used in Japanese writing.</p>
        </div>
    `,
    i18n,
});
