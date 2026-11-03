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
                        id: "step1",
                        selector: "#doc",
                        titleKey: "ui.tutorial.docs.read.step1.title",
                        bodyKey: "ui.tutorial.docs.read.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".docs-version-bar",
                        titleKey: "ui.tutorial.docs.read.step2.title",
                        bodyKey: "ui.tutorial.docs.read.step2.body",
                    },
                ],
            },
        ],
    },
];
