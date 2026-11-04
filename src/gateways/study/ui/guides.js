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
                        id: "learning-languages",
                        selector:
                            ".study-language-grid, .study-lang-settings-wrap",
                        titleKey:
                            "gateway.study.tutorial.preferences.learning.languages.title",
                        bodyKey:
                            "gateway.study.tutorial.preferences.learning.languages.body",
                    },
                    {
                        id: "available-activities",
                        selector:
                            ".study-language-grid, .study-lang-settings-wrap",
                        titleKey:
                            "gateway.study.tutorial.preferences.available.activities.title",
                        bodyKey:
                            "gateway.study.tutorial.preferences.available.activities.body",
                    },
                ],
            },
        ],
    },
];
