import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";

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
}
