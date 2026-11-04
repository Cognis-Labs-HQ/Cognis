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
                        id: "filter-logs",
                        selector: ".logs-stream-filters",
                        titleKey:
                            "gateway.logging.tutorial.logs.filter.logs.title",
                        bodyKey:
                            "gateway.logging.tutorial.logs.filter.logs.body",
                    },
                    {
                        id: "read-log-details",
                        selector: ".logs-stream-results",
                        titleKey:
                            "gateway.logging.tutorial.logs.read.log.details.title",
                        bodyKey:
                            "gateway.logging.tutorial.logs.read.log.details.body",
                    },
                ],
                scope: "#logs",
            },
        ],
        minRole: "admin",
    },
];
