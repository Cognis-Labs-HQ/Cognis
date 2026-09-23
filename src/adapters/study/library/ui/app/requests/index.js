import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { isAdminScope } from "/static/gateways/study/ui/language.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    bindLibraryRequestReviews,
    loadLibraryRequests,
    renderLibraryRequests,
} from "../requests.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    if (!isAdminScope()) {
        await navigateTo("/study");
        return;
    }
    const [model, requests] = await Promise.all([
        loadStudySubNavigationModel({
            fallbackLanguageCode: readSelectedStudyLanguageCode(),
        }),
        loadLibraryRequests(),
    ]);
    applyDocumentTitle(i18n, "gateway.study.library_requests");
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        elements: [
            {
                id: "study-library-requests",
                label: i18n.t("gateway.study.library_requests"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => renderLibraryRequests(requests, i18n),
            },
        ],
        preferenceKey: "study-library-requests-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_requests"),
            subtitle: i18n.t("gateway.study.library_requests_subtitle"),
        },
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
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal });
    bindLibraryRequestReviews(root, requests, { i18n, signal });
}

await mountWhenDirect(mount);
