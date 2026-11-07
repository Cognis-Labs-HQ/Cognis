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
                        selector: "[data-docs-navigation]",
                        titleKey:
                            "ui.tutorial.docs.read.browse.documents.title",
                        bodyKey: "ui.tutorial.docs.read.browse.documents.body",
                    },
                    {
                        highlightNext: true,
                        id: "read-the-current-page",
                        selector: "#doc",
                        titleKey:
                            "ui.tutorial.docs.read.read.the.current.page.title",
                        bodyKey:
                            "ui.tutorial.docs.read.read.the.current.page.body",
                    },
                    {
                        highlightNext: true,
                        id: "document-versions",
                        selector: ".docs-version-bar",
                        titleKey:
                            "ui.tutorial.docs.read.document.versions.title",
                        bodyKey: "ui.tutorial.docs.read.document.versions.body",
                    },
                ],
            },
        ],
    },
];
