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
                        id: "browse-a-layer",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.browse.a.layer.body",
                    },
                    {
                        id: "details-and-relationships",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.details.and.relationships.body",
                    },
                    {
                        id: "favourites-and-contributions",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.favourites.and.contributions.body",
                    },
                    {
                        id: "filter-and-select",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.filter.and.select.body",
                    },
                    {
                        id: "practise-writing",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.practise.writing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.practise.writing.body",
                    },
                    {
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
                        id: "search-results",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.search.results.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.search.results.body",
                    },
                    {
                        id: "inspect-before-importing",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.inspect.before.importing.body",
                    },
                    {
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
                        id: "request-status",
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.request.status.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.request.status.body",
                    },
                    {
                        id: "review-details",
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.review.details.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.review.details.body",
                    },
                    {
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
                        id: "find-records",
                        selector: "[data-library-quick-search]",
                        titleKey:
                            "adapter.study.library.tutorial.administration.find.records.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.find.records.body",
                    },
                    {
                        id: "create-and-edit",
                        selector: ".library-browser",
                        titleKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.create.and.edit.body",
                    },
                    {
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
