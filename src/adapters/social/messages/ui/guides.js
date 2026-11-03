export const guides = [
    {
        owner: "social.messages.page",
        definitions: [
            {
                id: "messages",
                page: ({ pathname }) => /^\/messages(?:\/|$)/.test(pathname),
                titleKey: "module.social.messages.tutorial.messages.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#messages-rooms-list",
                        titleKey:
                            "module.social.messages.tutorial.messages.step1.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#messages-thread-list",
                        titleKey:
                            "module.social.messages.tutorial.messages.step2.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".messages-composer-main",
                        titleKey:
                            "module.social.messages.tutorial.messages.step3.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.step3.body",
                    },
                ],
            },
        ],
    },
];
