export const guides = [
    {
        owner: "registration.administration.tutorials",
        definitions: [
            {
                id: "policy",
                page: "/administration",
                titleKey: "gateway.registration.tutorial.policy.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "registration-access",
                        selector: "#registration",
                        titleKey:
                            "gateway.registration.tutorial.policy.registration.access.title",
                        bodyKey:
                            "gateway.registration.tutorial.policy.registration.access.body",
                    },
                    {
                        highlightNext: true,
                        id: "apply-registration-rules",
                        selector: "#registration",
                        titleKey:
                            "gateway.registration.tutorial.policy.apply.registration.rules.title",
                        bodyKey:
                            "gateway.registration.tutorial.policy.apply.registration.rules.body",
                    },
                ],
                scope: "#registration",
            },
        ],
        minRole: "admin",
    },
];
