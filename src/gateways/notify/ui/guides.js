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
                        selector:
                            ".notif-matrix>tbody>tr>td>input:not(:disabled)",
                        targetMatch: "first",
                        titleKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.channels.and.categories.body",
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
                        selector: ".notif-debug-fields",
                        titleKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.title",
                        bodyKey:
                            "gateway.notify.tutorial.delivery.delivery.diagnostics.body",
                    },
                    {
                        highlightNext: true,
                        id: "test-delivery",
                        selector: ".notif-debug-send:not(:disabled)",
                        targetMatch: "first",
                        when: ({ targetAvailable }) => targetAvailable,
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
                        selector: ".notif-broadcast-role-options",
                        targetMatch: "first",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.audience.and.content.body",
                    },
                    {
                        highlightNext: true,
                        id: "refresh-list",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: ".notif-broadcast-refresh:not(:disabled)",
                        targetMatch: "first",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.refresh.list.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.refresh.list.body",
                    },
                    {
                        highlightNext: true,
                        id: "publication-state",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: ".notif-broadcast-toggle:not(:disabled)",
                        targetMatch: "first",
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
