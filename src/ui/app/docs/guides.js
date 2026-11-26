export const guides = [
    {
        owner: "ui.docs",
        definitions: [
            {
                id: "read",
                page: ({ pathname }) => /^\/docs(?:\/|$)/.test(pathname),
                titleKey: "ui.tutorial.docs.read.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "browse-documents",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "[data-docs-navigation]",
                        titleKey:
                            "ui.tutorial.docs.read.browse.documents.title",
                        bodyKey: "ui.tutorial.docs.read.browse.documents.body",
                    },
                    {
                        highlightNext: true,
                        id: "document-versions",
                        selector: ".docs-version-bar",
                        titleKey:
                            "ui.tutorial.docs.read.document.versions.title",
                        bodyKey: "ui.tutorial.docs.read.document.versions.body",
                    },
                    {
                        highlightNext: true,
                        id: "document-views",
                        selector: ".docs-view-bar",
                        titleKey: "ui.tutorial.docs.read.document.views.title",
                        bodyKey: "ui.tutorial.docs.read.document.views.body",
                    },
                    {
                        highlightNext: true,
                        id: "read-the-current-page",
                        selector: "[data-doc-content]",
                        titleKey:
                            "ui.tutorial.docs.read.read.the.current.page.title",
                        bodyKey:
                            "ui.tutorial.docs.read.read.the.current.page.body",
                    },
                ],
            },
        ],
    },
];
