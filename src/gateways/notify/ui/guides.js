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
                        id: "channels-and-categories",
                        selector: "#notif-matrix-container",
                        titleKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.body",
                    },
                    {
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
                        id: "delivery-diagnostics",
                        selector: "#notifications",
                        titleKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.title",
                        bodyKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.body",
                    },
                    {
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
                        id: "audience-and-content",
                        selector: "#broadcasts",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.body",
                    },
                    {
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
