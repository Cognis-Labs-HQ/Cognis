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
                        id: "step1",
                        selector: "#notif-matrix-container",
                        titleKey:
                            "gateway.notify.tutorial.preferences.step1.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#notif-matrix-container",
                        titleKey:
                            "gateway.notify.tutorial.preferences.step2.title",
                        bodyKey:
                            "gateway.notify.tutorial.preferences.step2.body",
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
                        id: "step1",
                        selector: "#notifications",
                        titleKey:
                            "gateway.notify.tutorial.delivery.step1.title",
                        bodyKey: "gateway.notify.tutorial.delivery.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#notifications",
                        titleKey:
                            "gateway.notify.tutorial.delivery.step2.title",
                        bodyKey: "gateway.notify.tutorial.delivery.step2.body",
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
                        id: "step1",
                        selector: "#broadcasts",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.step1.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#broadcasts",
                        titleKey:
                            "gateway.notify.tutorial.broadcasts.step2.title",
                        bodyKey:
                            "gateway.notify.tutorial.broadcasts.step2.body",
                    },
                ],
                scope: "#broadcasts",
            },
        ],
        minRole: "admin",
    },
];
