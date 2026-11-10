import { loadFavourites } from "/static/gateways/study/reuse/favourites.js";
import { bindRequestPreviews } from "../request-preview.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    createStudySubNavigationSlot,
} from "/static/gateways/study/sub-navigation.js";
import {
    bindLibraryRequestReviews,
    loadLibraryRequests,
    renderLibraryRequests,
    loadRequestProfiles,
} from "../requests.js";
import { loadLibrary } from "../data.js";
import { fetchLibraryPushRequests } from "/static/gateways/study/library-client.js";

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
        loadLibraryRequests(i18n),
    ]);
    applyDocumentTitle(i18n, "gateway.study.library_requests");
    const [preview, favourites] = await Promise.all([
        loadLibrary(undefined, i18n),
        loadFavourites({ signal }),
    ]);
    preview.profiles = await loadRequestProfiles(requests);
    let activeFilter = requests.some(({ canReview }) => canReview)
        ? "pending"
        : "mine";
    const render = () => {
        const list = root.querySelector("[data-library-requests]");
        if (list)
            list.outerHTML = renderLibraryRequests(
                requests,
                i18n,
                activeFilter,
                preview,
            );
        favourites.refresh(root);
        uiCtx.capabilities.get("ui:profileAvatarRenderer")?.hydrate(root);
    };
    const reload = async () => {
        const fresh = await fetchLibraryPushRequests();
        requests.splice(0, requests.length, ...fresh);
        preview.profiles = await loadRequestProfiles(requests);
        render();
    };
    const filters = ["mine", "pending", "approved", "rejected", "withdrawn"];
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
            render();
        },
    });
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
                render: () =>
                    renderLibraryRequests(
                        requests,
                        i18n,
                        activeFilter,
                        preview,
                    ),
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
        subNavigation: [createStudySubNavigationSlot(model, i18n)],
    });
    await composer.init();
    signal?.throwIfAborted();
    filterMenu.mount(root, { signal });
    bindStudySubNavigation(root, { signal, i18n });
    bindLibraryRequestReviews(root, requests, { i18n, signal, render, reload });
    bindRequestPreviews(root, requests, { ...preview, i18n, signal, reload });
    favourites.bind(root, { signal, i18n });
    uiCtx.capabilities.get("ui:profileAvatarRenderer")?.hydrate(root);
}

await mountWhenDirect(mount);
