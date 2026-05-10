import { renderDashboardLayout } from "/static/layouts/dashboard-layout.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.shared.brand.name");

await renderDashboardLayout(document.querySelector("#app"), {
    pageContext: "<h1>Japanese &#x1F1EF;&#x1F1F5;</h1>",
    content: `
        <div class="japanese-study-page">
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
