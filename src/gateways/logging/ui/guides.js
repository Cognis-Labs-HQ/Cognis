export const guides = [
    {
        owner: "logging.administration.tutorials",
        definitions: [
            {
                id: "logs",
                page: "/administration",
                titleKey: "gateway.logging.tutorial.logs.title",
                steps: [
                    {
                        id: "step1",
                        selector: ".logs-stream-filters",
                        titleKey: "gateway.logging.tutorial.logs.step1.title",
                        bodyKey: "gateway.logging.tutorial.logs.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".logs-stream-results",
                        titleKey: "gateway.logging.tutorial.logs.step2.title",
                        bodyKey: "gateway.logging.tutorial.logs.step2.body",
                    },
                ],
                scope: "#logs",
            },
        ],
        minRole: "admin",
    },
];
