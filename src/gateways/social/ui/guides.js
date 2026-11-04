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
                        id: "social-providers",
                        selector: "#social",
                        titleKey:
                            "gateway.social.tutorial.social.social.providers.title",
                        bodyKey:
                            "gateway.social.tutorial.social.social.providers.body",
                    },
                    {
                        id: "change-availability",
                        selector: "#social",
                        titleKey:
                            "gateway.social.tutorial.social.change.availability.title",
                        bodyKey:
                            "gateway.social.tutorial.social.change.availability.body",
                    },
                ],
                scope: "#social",
            },
        ],
        minRole: "admin",
    },
];
