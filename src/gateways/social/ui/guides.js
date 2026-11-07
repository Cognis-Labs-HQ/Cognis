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
                        highlightNext: true,
                        id: "social-providers",
                        selector: "#social table",
                        titleKey:
                            "gateway.social.tutorial.social.social.providers.title",
                        bodyKey:
                            "gateway.social.tutorial.social.social.providers.body",
                    },
                    {
                        highlightNext: true,
                        id: "change-availability",
                        selector:
                            "#social .pill-active, #social .pill-available",
                        targetMatch: "first",
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
