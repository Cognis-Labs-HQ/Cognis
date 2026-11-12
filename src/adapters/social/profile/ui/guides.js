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
                        highlightNext: true,
                        id: "profile-identity",
                        selector: ".profile-hero-identity",
                        titleKey:
                            "module.social.profile.tutorial.profile.profile.identity.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.profile.identity.body",
                    },
                    {
                        highlightNext: true,
                        id: "social-actions",
                        selector: ".profile-hero-action-row",
                        titleKey:
                            "module.social.profile.tutorial.profile.social.actions.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.social.actions.body",
                    },
                    {
                        highlightNext: true,
                        id: "posts",
                        selector: "[data-profile-post-list]",
                        titleKey:
                            "module.social.profile.tutorial.profile.posts.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.posts.body",
                    },
                    {
                        highlightNext: true,
                        id: "preview-post",
                        when: ({ targetAvailable }) => targetAvailable,
                        selector: "#profile-post-preview-toggle",
                        titleKey:
                            "module.social.profile.tutorial.profile.preview.post.title",
                        bodyKey:
                            "module.social.profile.tutorial.profile.preview.post.body",
                    },
                ],
            },
        ],
    },
];
