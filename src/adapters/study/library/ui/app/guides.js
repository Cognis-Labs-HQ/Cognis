export const guides = [
    {
        owner: "study.library.pages",
        definitions: [
            {
                id: "explore",
                page: ({ pathname }) =>
                    /^\/study\/explore(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.library.tutorial.explore.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "browse-a-layer",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.body",
                    },
                    {
                        highlightNext: true,
                        id: "details-and-relationships",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.body",
                    },
                    {
                        highlightNext: true,
                        id: "favourites-and-contributions",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.body",
                    },
                    {
                        highlightNext: true,
                        id: "filter-and-select",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.body",
                    },
                    {
                        highlightNext: true,
                        id: "practise-writing",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.practise.writing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.practise.writing.body",
                    },
                    {
                        highlightNext: true,
                        id: "collect-and-request",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.collect.and.request.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.collect.and.request.body",
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
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.body",
                    },
                    {
                        highlightNext: true,
                        id: "compare-dictionary-matches",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.compare.dictionary.matches.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.compare.dictionary.matches.body",
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
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.review.details.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.review.details.body",
                    },
                    {
                        highlightNext: true,
                        id: "follow-request-outcome",
                        selector: "#study-library-requests",
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
                        selector: ".library-browser",
                        titleKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.body",
                    },
                    {
                        highlightNext: true,
                        id: "visibility-and-review",
                        selector: ".library-browser",
                        titleKey:
                            "adapter.study.library.tutorial.administration.visibility.and.review.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.visibility.and.review.body",
                    },
                ],
                scope: ".library-browser",
            },
        ],
        minRole: "admin",
    },
];
