export const guides = [
    {
        owner: "ui.marketplace",
        definitions: [
            {
                id: "browse",
                page: "/administration/modules",
                titleKey: "ui.tutorial.marketplace.browse.title",
                steps: [
                    {
                        id: "step1",
                        selector: ".module-store-toolbar",
                        titleKey: "ui.tutorial.marketplace.browse.step1.title",
                        bodyKey: "ui.tutorial.marketplace.browse.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".module-store-grid",
                        titleKey: "ui.tutorial.marketplace.browse.step2.title",
                        bodyKey: "ui.tutorial.marketplace.browse.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".module-store-grid",
                        titleKey: "ui.tutorial.marketplace.browse.step3.title",
                        bodyKey: "ui.tutorial.marketplace.browse.step3.body",
                    },
                ],
                scope: ".module-store-grid",
            },
        ],
        minRole: "admin",
    },
];
