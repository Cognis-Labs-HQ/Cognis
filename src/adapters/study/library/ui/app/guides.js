import { exploreWalkthrough } from "../tutorials/walkthrough.js";

const optional = ({ targetAvailable }) => targetAvailable;

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
                steps: exploreWalkthrough(),
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
                        when: optional,
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
                        when: optional,
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
                        when: optional,
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
                        when: optional,
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
                        when: optional,
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
