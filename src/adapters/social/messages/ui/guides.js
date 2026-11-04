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
                        id: "rooms",
                        selector: "#messages-rooms-list",
                        titleKey:
                            "module.social.messages.tutorial.messages.rooms.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.rooms.body",
                    },
                    {
                        id: "room-history",
                        selector: "#messages-thread-list",
                        titleKey:
                            "module.social.messages.tutorial.messages.room.history.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.room.history.body",
                    },
                    {
                        id: "compose-and-preview",
                        selector: ".messages-composer-main",
                        titleKey:
                            "module.social.messages.tutorial.messages.compose.and.preview.title",
                        bodyKey:
                            "module.social.messages.tutorial.messages.compose.and.preview.body",
                    },
                ],
            },
        ],
    },
];
