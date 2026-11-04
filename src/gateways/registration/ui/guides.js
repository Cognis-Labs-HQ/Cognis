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
                        id: "registration-access",
                        selector: "#registration",
                        titleKey:
                            "gateway.registration.tutorial.policy.registration.access.title",
                        bodyKey:
                            "gateway.registration.tutorial.policy.registration.access.body",
                    },
                    {
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
