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
                        id: "step1",
                        selector: "#components",
                        titleKey: "ui.tutorial.admin.components.step1.title",
                        bodyKey: "ui.tutorial.admin.components.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#components",
                        titleKey: "ui.tutorial.admin.components.step2.title",
                        bodyKey: "ui.tutorial.admin.components.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#components",
                        titleKey: "ui.tutorial.admin.components.step3.title",
                        bodyKey: "ui.tutorial.admin.components.step3.body",
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
                        id: "step1",
                        selector: "#status",
                        titleKey: "ui.tutorial.admin.status.step1.title",
                        bodyKey: "ui.tutorial.admin.status.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#rerun-status",
                        titleKey: "ui.tutorial.admin.status.step2.title",
                        bodyKey: "ui.tutorial.admin.status.step2.body",
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
                        id: "step1",
                        selector: ".security-settings-form",
                        titleKey: "ui.tutorial.admin.security.step1.title",
                        bodyKey: "ui.tutorial.admin.security.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#security",
                        titleKey: "ui.tutorial.admin.security.step2.title",
                        bodyKey: "ui.tutorial.admin.security.step2.body",
                    },
                ],
                scope: "#security",
            },
        ],
        minRole: "admin",
    },
];
