import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/leaderboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "gateway.study.leaderboard_label");
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: readSelectedStudyLanguageCode(),
    });
    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "study-leaderboard",
                label: i18n.t("gateway.study.leaderboard_label"),
                pinned: true,
                width: "fill",
                render: () =>
                    `<section class="study-leaderboard-empty"><h2>${escapeHtml(i18n.t("gateway.study.leaderboard_heading"))}</h2><p>${escapeHtml(i18n.t("gateway.study.leaderboard_empty"))}</p></section>`,
            },
        ],
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.leaderboard_label"),
            subtitle: i18n.t("gateway.study.leaderboard_subtitle"),
        },
        preferenceKey: "study-leaderboard-layout",
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: window.location.pathname,
                        i18n,
                    }),
            },
        ],
        toolbar: [],
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal });
}

await mountWhenDirect(mount);
