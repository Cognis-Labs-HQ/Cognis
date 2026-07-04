/**
 * Shared Study alphabet page renderer for language module child components.
 *
 * Public exports:
 *   mountStudyAlphabetPage — mounts a paginated character grid for a given
 *   language and character class, wired to the study sub-navigation.
 *
 * Usage:
 *   import { mountStudyAlphabetPage } from
 *     '/static/modules/study/languages/reuse/alphabet-page.js';
 *
 *   export async function mount(root, { signal } = {}) {
 *     await mountStudyAlphabetPage(root, {
 *       languageCode: 'ja',
 *       fallbackLanguageCode: 'ja',
 *       characterClass: 'hiragana',
 *       pageElementId: 'hiragana-grid',
 *       pageLabel: 'Hiragana',
 *       preferenceKey: 'hiragana-layout',
 *       pageTitleKey: 'module.study.ja.hiragana_title',
 *       pageSubtitleKey: 'module.study.ja.hiragana_subtitle',
 *       renderSection: (characters) => renderHiraganaGrid(characters),
 *     });
 *   }
 *
 * @param {HTMLElement} root - Root element passed to the page mount function.
 * @param {object} options
 * @param {string} options.languageCode - BCP 47 code of the language to load characters for.
 * @param {string} [options.fallbackLanguageCode] - Fallback BCP 47 code for sub-nav model; defaults to languageCode.
 * @param {string} options.characterClass - Character class to load from the library (e.g. 'hiragana').
 * @param {string[]} [options.componentStringBaseUrls] - Base URLs for i18n string bundles.
 * @param {string} options.pageElementId - DOM element id for the page content section.
 * @param {string} options.pageLabel - Display label for the page content section.
 * @param {string} options.preferenceKey - User preference key for layout persistence.
 * @param {string} options.pageTitleKey - i18n key for the page title.
 * @param {string} options.pageSubtitleKey - i18n key for the page subtitle.
 * @param {string} [options.subNavigationLabel] - Label for the sub-navigation entry; defaults to 'Study'.
 * @param {(characters: object[]) => string} options.renderSection - Renders the character grid HTML.
 * @returns {Promise<void>}
 */
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";
import { mountStudyClassFooter } from "/static/adapters/study/classes/study-footer.js";

async function loadAlphabetCharacters(languageCode, characterClass) {
    try {
        const response = await apiFetch(
            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/library/characters?characterClass=${encodeURIComponent(characterClass)}`,
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

export async function mountStudyAlphabetPage(
    root,
    {
        languageCode,
        fallbackLanguageCode,
        characterClass,
        componentStringBaseUrls = ["/static/gateways/study/languages"],
        pageElementId,
        pageLabel,
        preferenceKey,
        pageTitleKey,
        pageSubtitleKey,
        subNavigationLabel = "Study",
        renderSection,
    },
) {
    const i18n = await createI18n({ componentStringBaseUrls });
    applyDocumentTitle(i18n, "ui.shared.brand.name");

    const currentPath = window.location.pathname;
    const [subNavigationModel, alphabetCharacters] = await Promise.all([
        loadStudySubNavigationModel({
            fallbackLanguageCode: fallbackLanguageCode ?? languageCode,
        }),
        loadAlphabetCharacters(languageCode, characterClass),
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
                id: pageElementId,
                label: pageLabel,
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => renderSection({ i18n, alphabetCharacters }),
            },
        ],
        preferenceKey,
        i18n,
        pageContext: {
            title: i18n.t(pageTitleKey),
            subtitle: i18n.t(pageSubtitleKey),
        },
        toolbar: [],
        subNavigation: [
            {
                id: `${pageElementId}-subnav`,
                label: subNavigationLabel,
                render: renderSubNavigation,
            },
        ],
    });

    await composer.init();
    await mountStudyClassFooter({
        root,
        signal,
        i18n,
        languageCode,
    });
}
