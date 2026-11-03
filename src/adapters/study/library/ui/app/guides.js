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
                        id: "step1",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.step1.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.step2.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#study-library-layer",
                        titleKey:
                            "adapter.study.library.tutorial.explore.step3.title",
                        bodyKey:
                            "adapter.study.library.tutorial.explore.step3.body",
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
                        id: "step1",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.step1.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#dictionary-results",
                        titleKey:
                            "adapter.study.library.tutorial.search.step2.title",
                        bodyKey:
                            "adapter.study.library.tutorial.search.step2.body",
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
                        id: "step1",
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.step1.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#study-library-requests",
                        titleKey:
                            "adapter.study.library.tutorial.requests.step2.title",
                        bodyKey:
                            "adapter.study.library.tutorial.requests.step2.body",
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
                        id: "step1",
                        selector: "[data-library-quick-search]",
                        titleKey:
                            "adapter.study.library.tutorial.administration.step1.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".library-browser",
                        titleKey:
                            "adapter.study.library.tutorial.administration.step2.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".library-browser",
                        titleKey:
                            "adapter.study.library.tutorial.administration.step3.title",
                        bodyKey:
                            "adapter.study.library.tutorial.administration.step3.body",
                    },
                ],
                scope: ".library-browser",
            },
        ],
        minRole: "admin",
    },
];
