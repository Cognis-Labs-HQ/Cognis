export const guides = [
    {
        owner: "study.library.pages",
        definitions: [
            {
                id: "explore",
                page: ({ pathname }) =>
                    /^\/study\/explore(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.library.tutorial.explore.title",
                visibleWhen: ".library-browser",
                steps: [
                    {
                        highlightNext: true,
                        id: "browse-a-layer",
                        selector: ".library-layer-navigation",
                        titleKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.body",
                    },
                    {
                        highlightNext: true,
                        id: "filter-and-select",
                        selector: ".library-filters",
                        titleKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.body",
                        targetMatch: "first",
                    },
                    {
                        highlightNext: true,
                        id: "favourites-and-contributions",
                        selector:
                            "[data-study-favourite][data-study-favourite-kind=library]",
                        titleKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.body",
                        targetMatch: "first",
                    },
                    {
                        id: "details-and-relationships",
                        selector: ".library-entry-card[data-library-entry]",
                        titleKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.body",
                        highlightNext: false,
                        targetMatch: "first",
                        interaction: "target",
                        suppressHover: true,
                        group: "entry-details",
                        popup: ".library-entry-popup",
                        advance: { event: "click" },
                    },
                    {
                        highlightNext: true,
                        id: "read-details",
                        selector: ".library-detail",
                        titleKey:
                            "adapter.study.library.tutorial.explore.read.details.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.read.details.body",
                        missing: { timeoutMs: 15000, action: "skip" },
                        portal: ".library-entry-popup",
                        popup: ".library-entry-popup",
                        layer: "overlay",
                        group: "entry-details",
                        dependsOn: ["details-and-relationships"],
                        enter: ({ target, groupSignal, ctx }) => {
                            ctx.capabilities
                                .get("ui:transientSurfaces")
                                .attachLifetime(
                                    target.closest(".library-entry-popup"),
                                    groupSignal,
                                );
                        },
                    },
                    {
                        highlightNext: true,
                        id: "practise-writing",
                        selector: "[data-popup-action=draw]",
                        titleKey:
                            "adapter.study.library.tutorial.explore.practise.writing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.practise.writing.body",
                        when: ({ targetAvailable }) => targetAvailable,
                        portal: ".library-entry-popup",
                        popup: ".library-entry-popup",
                        layer: "overlay",
                        group: "entry-details",
                        dependsOn: ["details-and-relationships"],
                    },
                ],
            },
            {
                id: "search",
                page: ({ pathname }) =>
                    /^\/study\/library\/search(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.library.tutorial.search.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "search-results",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.search.results.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.search.results.body",
                    },
                    {
                        highlightNext: true,
                        id: "inspect-before-importing",
                        selector: "[data-dictionary-result]",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.body",
                    },
                ],
            },
            {
                id: "requests",
                page: ({ pathname }) =>
                    /^\/study\/(?:library\/)?requests(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.library.tutorial.requests.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "request-status",
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.request.status.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.request.status.body",
                    },
                    {
                        highlightNext: true,
                        id: "review-details",
                        selector: "[data-library-request]",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.library.tutorial.requests.review.details.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.review.details.body",
                    },
                    {
                        highlightNext: true,
                        id: "follow-request-outcome",
                        selector:
                            ".library-request-header .library-metadata-pill",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.library.tutorial.requests.follow.request.outcome.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.follow.request.outcome.body",
                    },
                ],
            },
        ],
    },
    {
        owner: "study.library.admin",
        definitions: [
            {
                id: "administration",
                page: ({ pathname }) =>
                    /^\/study\/library(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.library.tutorial.administration.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "find-records",
                        selector: "[data-library-quick-search]",
                        titleKey:
                            "adapter.study.library.tutorial.administration.find.records.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.find.records.body",
                    },
                    {
                        highlightNext: true,
                        id: "create-and-edit",
                        selector: "[data-library-admin-edit]",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.body",
                    },
                    {
                        highlightNext: true,
                        id: "visibility-and-review",
                        selector: ".library-entry-card-status",
                        targetMatch: "first",
                        titleKey:
                            "adapter.study.library.tutorial.administration.visibility.and.review.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.visibility.and.review.body",
                    },
                ],
                visibleWhen: ".library-browser",
            },
        ],
        minRole: "admin",
    },
];
