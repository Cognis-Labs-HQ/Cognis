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
                        id: "set-up-a-method",
                        selector: "#available-tfa-methods",
                        titleKey:
                            "gateway.tfa.tutorial.methods.set.up.a.method.title",
                        bodyKey:
                            "gateway.tfa.tutorial.methods.set.up.a.method.body",
                    },
                    {
                        id: "preferred-methods",
                        selector: "#preferred-tfa-methods",
                        titleKey:
                            "gateway.tfa.tutorial.methods.preferred.methods.title",
                        bodyKey:
                            "gateway.tfa.tutorial.methods.preferred.methods.body",
                    },
                    {
                        id: "recovery-codes",
                        selector: ".settings-auth-recovery-codes",
                        titleKey:
                            "gateway.tfa.tutorial.methods.recovery.codes.title",
                        bodyKey:
                            "gateway.tfa.tutorial.methods.recovery.codes.body",
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
                        id: "enforcement-policy",
                        selector: "#tfa-enforcement",
                        titleKey:
                            "gateway.tfa.tutorial.enforcement.enforcement.policy.title",
                        bodyKey:
                            "gateway.tfa.tutorial.enforcement.enforcement.policy.body",
                    },
                    {
                        id: "apply-policy",
                        selector: "#tfa-admin-save-btn",
                        titleKey:
                            "gateway.tfa.tutorial.enforcement.apply.policy.title",
                        bodyKey:
                            "gateway.tfa.tutorial.enforcement.apply.policy.body",
                    },
                ],
                scope: "#tfa-enforcement",
            },
        ],
        minRole: "admin",
    },
];
