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
                        id: "discovery-and-sources",
                        selector: ".module-store-toolbar",
                        titleKey:
                            "ui.tutorial.marketplace.browse.discovery.and.sources.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.discovery.and.sources.body",
                    },
                    {
                        id: "module-details",
                        selector: ".module-store-grid",
                        titleKey:
                            "ui.tutorial.marketplace.browse.module.details.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.module.details.body",
                    },
                    {
                        id: "install-and-update",
                        selector: ".module-store-grid",
                        titleKey:
                            "ui.tutorial.marketplace.browse.install.and.update.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.install.and.update.body",
                    },
                ],
                scope: ".module-store-grid",
            },
        ],
        minRole: "admin",
    },
];
