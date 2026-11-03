export const guides = [
    {
        owner: "tfa.security.tutorials",
        definitions: [
            {
                id: "methods",
                page: "/settings",
                titleKey: "gateway.tfa.tutorial.methods.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#available-tfa-methods",
                        titleKey: "gateway.tfa.tutorial.methods.step1.title",
                        bodyKey: "gateway.tfa.tutorial.methods.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#preferred-tfa-methods",
                        titleKey: "gateway.tfa.tutorial.methods.step2.title",
                        bodyKey: "gateway.tfa.tutorial.methods.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".settings-auth-recovery-codes",
                        titleKey: "gateway.tfa.tutorial.methods.step3.title",
                        bodyKey: "gateway.tfa.tutorial.methods.step3.body",
                    },
                ],
                scope: "#tfa-settings-panel",
            },
        ],
    },
    {
        owner: "tfa.administration.tutorials",
        definitions: [
            {
                id: "enforcement",
                page: "/administration",
                titleKey: "gateway.tfa.tutorial.enforcement.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#tfa-enforcement",
                        titleKey:
                            "gateway.tfa.tutorial.enforcement.step1.title",
                        bodyKey: "gateway.tfa.tutorial.enforcement.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#tfa-admin-save-btn",
                        titleKey:
                            "gateway.tfa.tutorial.enforcement.step2.title",
                        bodyKey: "gateway.tfa.tutorial.enforcement.step2.body",
                    },
                ],
                scope: "#tfa-enforcement",
            },
        ],
        minRole: "admin",
    },
];
