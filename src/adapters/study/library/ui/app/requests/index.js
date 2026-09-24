import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    isAdminScope,
    isTeacherScope,
} from "/static/gateways/study/ui/language.js";
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
    const [model, requests] = await Promise.all([
        loadStudySubNavigationModel({
            fallbackLanguageCode: readSelectedStudyLanguageCode(),
        }),
        loadLibraryRequests(),
    ]);
    applyDocumentTitle(i18n, "gateway.study.library_requests");
    let activeFilter = "mine";
    const filters = ["mine", "approved", "rejected", "pending"];
    if (isAdminScope() || isTeacherScope()) filters.push("review");
    const filterMenu = createSideMenu({
        groups: [
            {
                id: "request-filters",
                label: "",
                collapsible: false,
                items: filters.map((id) => ({
                    id,
                    label: i18n.t(`gateway.study.library_requests_${id}`),
                })),
            },
        ],
        storageKeyPrefix: "study-library-request-filter",
        activeId: activeFilter,
        onSelect: (filter) => {
            activeFilter = filter;
            const list = root.querySelector("[data-library-requests]");
            if (list)
                list.outerHTML = renderLibraryRequests(
                    requests,
                    i18n,
                    activeFilter,
                );
        },
    });
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: true,
        elements: [
            {
                id: "study-library-requests",
                label: i18n.t("gateway.study.library_requests"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    renderLibraryRequests(requests, i18n, activeFilter),
            },
        ],
        preferenceKey: "study-library-requests-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_requests"),
            subtitle: i18n.t("gateway.study.library_requests_subtitle"),
        },
        toolbar: [
            {
                id: "library-request-filters",
                label: i18n.t("gateway.study.library_requests"),
                render: () => filterMenu.render(),
            },
        ],
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
    filterMenu.mount(root, { signal });
    bindStudySubNavigation(root, { signal });
    bindLibraryRequestReviews(root, requests, { i18n, signal });
}

await mountWhenDirect(mount);
