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
                        id: "profile-identity",
                        selector: "#hero",
                        titleKey:
                            "module.social.profile.tutorial.profile.profile.identity.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.profile.identity.body",
                    },
                    {
                        id: "posts",
                        selector: "#posts",
                        titleKey:
                            "module.social.profile.tutorial.profile.posts.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.posts.body",
                    },
                    {
                        id: "social-actions",
                        selector: "#hero",
                        titleKey:
                            "module.social.profile.tutorial.profile.social.actions.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.social.actions.body",
                    },
                ],
            },
        ],
    },
];
