export const guides = [
    {
        owner: "ui.settings",
        definitions: [
            {
                id: "general",
                page: "/settings",
                titleKey: "ui.tutorial.settings.general.title",
                steps: [
                    {
                        id: "email-addresses",
                        selector: "#email-list",
                        titleKey:
                            "ui.tutorial.settings.general.email.addresses.title",
                        bodyKey:
                            "ui.tutorial.settings.general.email.addresses.body",
                    },
                    {
                        id: "offline-access",
                        selector: "#pref-offline-enabled",
                        titleKey:
                            "ui.tutorial.settings.general.offline.access.title",
                        bodyKey:
                            "ui.tutorial.settings.general.offline.access.body",
                    },
                    {
                        id: "account-lifecycle",
                        selector: ".settings-danger-zone",
                        titleKey:
                            "ui.tutorial.settings.general.account.lifecycle.title",
                        bodyKey:
                            "ui.tutorial.settings.general.account.lifecycle.body",
                    },
                ],
                scope: "#general",
            },
            {
                id: "appearance",
                page: "/settings",
                titleKey: "ui.reuse.appearance",
                steps: [
                    {
                        id: "font-and-size",
                        selector: "#pref-font-picker",
                        titleKey:
                            "ui.tutorial.settings.appearance.font.and.size.title",
                        bodyKey:
                            "ui.tutorial.settings.appearance.font.and.size.body",
                    },
                    {
                        id: "theme",
                        selector: "#pref-theme-selector",
                        titleKey: "ui.tutorial.settings.appearance.theme.title",
                        bodyKey: "ui.tutorial.settings.appearance.theme.body",
                    },
                    {
                        id: "message-layout",
                        selector: "#pref-message-style-selector",
                        titleKey:
                            "ui.tutorial.settings.appearance.message.layout.title",
                        bodyKey:
                            "ui.tutorial.settings.appearance.message.layout.body",
                    },
                ],
                scope: "#appearance",
            },
            {
                id: "language",
                page: "/settings",
                titleKey: "ui.tutorial.settings.language.title",
                steps: [
                    {
                        id: "available-languages",
                        selector: "#available-languages",
                        titleKey:
                            "ui.tutorial.settings.language.available.languages.title",
                        bodyKey:
                            "ui.tutorial.settings.language.available.languages.body",
                    },
                    {
                        id: "language-priority",
                        selector: "#preferred-languages",
                        titleKey:
                            "ui.tutorial.settings.language.language.priority.title",
                        bodyKey:
                            "ui.tutorial.settings.language.language.priority.body",
                    },
                    {
                        id: "browser-language",
                        selector: "#pref-language-sync-from-browser",
                        titleKey:
                            "ui.tutorial.settings.language.browser.language.title",
                        bodyKey:
                            "ui.tutorial.settings.language.browser.language.body",
                    },
                ],
                scope: "#language",
            },
            {
                id: "datetime",
                page: "/settings",
                titleKey: "ui.tutorial.settings.datetime.title",
                steps: [
                    {
                        id: "time-zone",
                        selector: "#pref-timezone-select",
                        titleKey:
                            "ui.tutorial.settings.datetime.time.zone.title",
                        bodyKey: "ui.tutorial.settings.datetime.time.zone.body",
                    },
                    {
                        id: "time-format",
                        selector: "#pref-time-format-select",
                        titleKey:
                            "ui.tutorial.settings.datetime.time.format.title",
                        bodyKey:
                            "ui.tutorial.settings.datetime.time.format.body",
                    },
                ],
                scope: "#datetime",
            },
            {
                id: "advanced",
                page: "/settings",
                titleKey: "ui.tutorial.settings.advanced.title",
                steps: [
                    {
                        id: "preference-data",
                        selector: "#prefs-dump",
                        titleKey:
                            "ui.tutorial.settings.advanced.preference.data.title",
                        bodyKey:
                            "ui.tutorial.settings.advanced.preference.data.body",
                    },
                    {
                        id: "review-changes",
                        selector: "#advanced",
                        titleKey:
                            "ui.tutorial.settings.advanced.review.changes.title",
                        bodyKey:
                            "ui.tutorial.settings.advanced.review.changes.body",
                    },
                ],
                scope: "#advanced",
            },
        ],
    },
];
