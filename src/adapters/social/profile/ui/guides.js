export const guides = [
    {
        owner: "social.profile.page",
        definitions: [
            {
                id: "profile",
                page: ({ pathname }) => /^\/profile(?:\/|$)/.test(pathname),
                titleKey: "module.social.profile.tutorial.profile.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#hero",
                        titleKey:
                            "module.social.profile.tutorial.profile.step1.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#posts",
                        titleKey:
                            "module.social.profile.tutorial.profile.step2.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#hero",
                        titleKey:
                            "module.social.profile.tutorial.profile.step3.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.step3.body",
                    },
                ],
            },
        ],
    },
];
