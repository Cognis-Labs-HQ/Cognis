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
                        id: "step1",
                        selector: "[data-files-quota-admin]",
                        titleKey: "gateway.files.tutorial.quotas.step1.title",
                        bodyKey: "gateway.files.tutorial.quotas.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "[data-files-quota-admin]",
                        titleKey: "gateway.files.tutorial.quotas.step2.title",
                        bodyKey: "gateway.files.tutorial.quotas.step2.body",
                    },
                ],
                scope: "[data-files-quota-admin]",
            },
        ],
        minRole: "admin",
    },
];
