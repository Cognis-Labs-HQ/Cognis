export const guides = [
    {
        owner: "social.administration.tutorials",
        definitions: [
            {
                id: "social",
                page: "/administration",
                titleKey: "gateway.social.tutorial.social.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#social",
                        titleKey: "gateway.social.tutorial.social.step1.title",
                        bodyKey: "gateway.social.tutorial.social.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#social",
                        titleKey: "gateway.social.tutorial.social.step2.title",
                        bodyKey: "gateway.social.tutorial.social.step2.body",
                    },
                ],
                scope: "#social",
            },
        ],
        minRole: "admin",
    },
];
