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
                        selector:
                            '[data-files-quota-admin]>label>input[name="global"]',
                        titleKey:
                            "gateway.files.tutorial.quotas.default.quota.title",
                        bodyKey:
                            "gateway.files.tutorial.quotas.default.quota.body",
                    },
                    {
                        highlightNext: true,
                        id: "namespace-limits",
                        selector: "[data-files-save-namespace]",
                        targetMatch: "first",
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
