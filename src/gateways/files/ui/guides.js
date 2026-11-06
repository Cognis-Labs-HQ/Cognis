export const guides = [
    {
        owner: "files.administration.tutorials",
        definitions: [
            {
                id: "quotas",
                page: "/administration",
                titleKey: "gateway.files.tutorial.quotas.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "default-quota",
                        selector: "[data-files-quota-admin]",
                        titleKey:
                            "gateway.files.tutorial.quotas.default.quota.title",
                        bodyKey:
                            "gateway.files.tutorial.quotas.default.quota.body",
                    },
                    {
                        highlightNext: true,
                        id: "namespace-limits",
                        selector: "[data-files-quota-admin]",
                        titleKey:
                            "gateway.files.tutorial.quotas.namespace.limits.title",
                        bodyKey:
                            "gateway.files.tutorial.quotas.namespace.limits.body",
                    },
                ],
                scope: "[data-files-quota-admin]",
            },
        ],
        minRole: "admin",
    },
];
