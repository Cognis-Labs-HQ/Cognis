export const guides = [
    {
        owner: "notify.preferences.tutorials",
        definitions: [
            {
                id: "preferences",
                page: "/settings",
                titleKey: "gateway.notify.tutorial.preferences.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "channels-and-categories",
                        selector: "#notif-matrix-container",
                        titleKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.body",
                    },
                    {
                        highlightNext: true,
                        id: "save-preferences",
                        selector: "#notif-matrix-container",
                        titleKey:
                            "gateway.notify.tutorial.preferences.save.preferences.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.save.preferences.body",
                    },
                ],
                scope: "#notif-matrix-container",
            },
        ],
    },
    {
        owner: "notify.administration.tutorials",
        definitions: [
            {
                id: "delivery",
                page: "/administration",
                titleKey: "gateway.notify.tutorial.delivery.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "delivery-diagnostics",
                        selector: "#notifications",
                        titleKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.title",
                        bodyKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.body",
                    },
                    {
                        highlightNext: true,
                        id: "test-delivery",
                        selector: "#notifications",
                        titleKey:
                            "gateway.notify.tutorial.delivery.test.delivery.title",
                        bodyKey:
                            "gateway.notify.tutorial.delivery.test.delivery.body",
                    },
                ],
                scope: "#notifications",
            },
            {
                id: "broadcasts",
                page: "/administration",
                titleKey: "gateway.notify.tutorial.broadcasts.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "audience-and-content",
                        selector: "#broadcasts",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.body",
                    },
                    {
                        highlightNext: true,
                        id: "publication-state",
                        selector: "#broadcasts",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.publication.state.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.publication.state.body",
                    },
                ],
                scope: "#broadcasts",
            },
        ],
        minRole: "admin",
    },
];
