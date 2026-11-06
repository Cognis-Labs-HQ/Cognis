export const guides = [
    {
        owner: "ui.administration",
        definitions: [
            {
                id: "components",
                page: "/administration",
                titleKey: "ui.tutorial.admin.components.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "gateways-and-adapters",
                        selector: "#components",
                        titleKey:
                            "ui.tutorial.admin.components.gateways.and.adapters.title",
                        bodyKey:
                            "ui.tutorial.admin.components.gateways.and.adapters.body",
                    },
                    {
                        highlightNext: true,
                        id: "enable-and-disable",
                        selector: "#components",
                        titleKey:
                            "ui.tutorial.admin.components.enable.and.disable.title",
                        bodyKey:
                            "ui.tutorial.admin.components.enable.and.disable.body",
                    },
                    {
                        highlightNext: true,
                        id: "configuration",
                        selector: "#components",
                        titleKey:
                            "ui.tutorial.admin.components.configuration.title",
                        bodyKey:
                            "ui.tutorial.admin.components.configuration.body",
                    },
                ],
                scope: "#components",
            },
            {
                id: "status",
                page: "/administration",
                titleKey: "ui.tutorial.admin.status.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "health-and-integrity",
                        selector: "#status",
                        titleKey:
                            "ui.tutorial.admin.status.health.and.integrity.title",
                        bodyKey:
                            "ui.tutorial.admin.status.health.and.integrity.body",
                    },
                    {
                        highlightNext: true,
                        id: "refresh-checks",
                        selector: "#rerun-status",
                        titleKey:
                            "ui.tutorial.admin.status.refresh.checks.title",
                        bodyKey: "ui.tutorial.admin.status.refresh.checks.body",
                    },
                ],
                scope: "#status",
            },
            {
                id: "security",
                page: "/administration",
                titleKey: "ui.tutorial.admin.security.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "session-policy",
                        selector: ".security-settings-form",
                        titleKey:
                            "ui.tutorial.admin.security.session.policy.title",
                        bodyKey:
                            "ui.tutorial.admin.security.session.policy.body",
                    },
                    {
                        highlightNext: true,
                        id: "save-deliberately",
                        selector: "#security",
                        titleKey:
                            "ui.tutorial.admin.security.save.deliberately.title",
                        bodyKey:
                            "ui.tutorial.admin.security.save.deliberately.body",
                    },
                ],
                scope: "#security",
            },
        ],
        minRole: "admin",
    },
];
