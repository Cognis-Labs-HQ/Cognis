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
                        highlightNext: true,
                        id: "discovery-and-sources",
                        selector: ".module-store-toolbar",
                        titleKey:
                            "ui.tutorial.marketplace.browse.discovery.and.sources.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.discovery.and.sources.body",
                    },
                    {
                        highlightNext: true,
                        id: "module-details",
                        selector: ".module-store-card",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.marketplace.browse.module.details.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.module.details.body",
                    },
                    {
                        highlightNext: true,
                        id: "install-and-update",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector:
                            ".module-store-card-actions>button:not(:disabled):not([data-module-recheck])",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.marketplace.browse.install.and.update.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.install.and.update.body",
                    },
                    {
                        highlightNext: true,
                        id: "check-state",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "[data-module-recheck]:not(:disabled)",
                        targetMatch: "first",
                        titleKey: "ui.tutorial.marketplace.check.state.title",
                        bodyKey: "ui.tutorial.marketplace.check.state.body",
                    },
                    {
                        highlightNext: true,
                        id: "review-source",
                        selector: "#module-marketplace-settings",
                        titleKey:
                            "ui.tutorial.marketplace.browse.review.source.title",
                        bodyKey:
                            "ui.tutorial.marketplace.browse.review.source.body",
                    },
                ],
                scope: ".module-store-results:has(.module-store-grid)",
            },
            {
                id: "details",
                page: ({ pathname }) =>
                    /^\/administration\/modules(?:\/|$)/.test(pathname),
                scope: ".module-detail",
                titleKey: "ui.tutorial.marketplace.details.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "review-release",
                        selector: ".module-detail-release",
                        titleKey:
                            "ui.tutorial.marketplace.details.review.release.title",
                        bodyKey:
                            "ui.tutorial.marketplace.details.review.release.body",
                    },
                    {
                        highlightNext: true,
                        id: "configure-module",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "[data-module-preferences]",
                        titleKey:
                            "ui.tutorial.marketplace.details.configure.module.title",
                        bodyKey:
                            "ui.tutorial.marketplace.details.configure.module.body",
                    },
                    {
                        highlightNext: true,
                        id: "check-state",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "[data-module-recheck]:not(:disabled)",
                        targetMatch: "first",
                        titleKey: "ui.tutorial.marketplace.check.state.title",
                        bodyKey: "ui.tutorial.marketplace.check.state.body",
                    },
                    {
                        highlightNext: true,
                        id: "manage-lifecycle",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "[data-module-menu]",
                        titleKey:
                            "ui.tutorial.marketplace.details.manage.lifecycle.title",
                        bodyKey:
                            "ui.tutorial.marketplace.details.manage.lifecycle.body",
                    },
                ],
            },
        ],
        minRole: "admin",
    },
];
