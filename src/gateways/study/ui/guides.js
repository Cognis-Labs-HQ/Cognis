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
                        highlightNext: true,
                        id: "learning-languages",
                        selector:
                            ".study-language-grid, .study-lang-settings-column:first-child",
                        titleKey:
                            "gateway.study.tutorial.preferences.learning.languages.title",
                        bodyKey:
                            "gateway.study.tutorial.preferences.learning.languages.body",
                    },
                    {
                        highlightNext: true,
                        id: "available-activities",
                        selector:
                            ".study-welcome-actions, .study-lang-settings-column:last-child",
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
