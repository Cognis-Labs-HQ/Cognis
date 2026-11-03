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
                        id: "step1",
                        selector: "#registration",
                        titleKey:
                            "gateway.registration.tutorial.policy.step1.title",
                        bodyKey:
                            "gateway.registration.tutorial.policy.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#registration",
                        titleKey:
                            "gateway.registration.tutorial.policy.step2.title",
                        bodyKey:
                            "gateway.registration.tutorial.policy.step2.body",
                    },
                ],
                scope: "#registration",
            },
        ],
        minRole: "admin",
    },
];
