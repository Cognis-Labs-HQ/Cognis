export const guides = [
    {
        owner: "study.preferences",
        definitions: [
            {
                id: "preferences",
                page: ({ pathname }) =>
                    /^\/study\/(?:settings|welcome)$/.test(pathname),
                titleKey: "gateway.study.tutorial.preferences.title",
                steps: [
                    {
                        id: "step1",
                        selector:
                            ".study-language-grid, .study-lang-settings-wrap",
                        titleKey:
                            "gateway.study.tutorial.preferences.step1.title",
                        bodyKey:
                            "gateway.study.tutorial.preferences.step1.body",
                    },
                    {
                        id: "step2",
                        selector:
                            ".study-language-grid, .study-lang-settings-wrap",
                        titleKey:
                            "gateway.study.tutorial.preferences.step2.title",
                        bodyKey:
                            "gateway.study.tutorial.preferences.step2.body",
                    },
                ],
            },
        ],
    },
];
