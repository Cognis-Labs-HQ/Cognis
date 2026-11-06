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
                        highlightNext: true,
                        id: "email-addresses",
                        selector: "#email-list",
                        titleKey:
                            "ui.tutorial.settings.general.email.addresses.title",
                        bodyKey:
                            "ui.tutorial.settings.general.email.addresses.body",
                    },
                    {
                        highlightNext: true,
                        id: "offline-access",
                        selector: "#pref-offline-enabled",
                        titleKey:
                            "ui.tutorial.settings.general.offline.access.title",
                        bodyKey:
                            "ui.tutorial.settings.general.offline.access.body",
                    },
                    {
                        highlightNext: true,
                        id: "account-lifecycle",
                        selector: ".settings-danger-zone",
                        titleKey:
                            "ui.tutorial.settings.general.account.lifecycle.title",
                        bodyKey:
                            "ui.tutorial.settings.general.account.lifecycle.body",
                    },
                    {
                        highlightNext: true,
                        id: "save-preferences",
                        selector: "#general",
                        titleKey:
                            "ui.tutorial.settings.general.save.preferences.title",
                        bodyKey:
                            "ui.tutorial.settings.general.save.preferences.body",
                    },
                    {
                        highlightNext: true,
                        id: "release-notes",
                        selector: "#pref-release-changelog-show",
                        titleKey:
                            "ui.tutorial.settings.general.release.notes.title",
                        bodyKey:
                            "ui.tutorial.settings.general.release.notes.body",
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
                        highlightNext: true,
                        id: "font-and-size",
                        selector: "#pref-font-picker",
                        titleKey:
                            "ui.tutorial.settings.appearance.font.and.size.title",
                        bodyKey:
                            "ui.tutorial.settings.appearance.font.and.size.body",
                    },
                    {
                        highlightNext: true,
                        id: "theme",
                        selector: "#pref-theme-selector",
                        titleKey: "ui.tutorial.settings.appearance.theme.title",
                        bodyKey: "ui.tutorial.settings.appearance.theme.body",
                    },
                    {
                        highlightNext: true,
                        id: "message-layout",
                        selector: "#pref-message-style-selector",
                        titleKey:
                            "ui.tutorial.settings.appearance.message.layout.title",
                        bodyKey:
                            "ui.tutorial.settings.appearance.message.layout.body",
                    },
                    {
                        highlightNext: true,
                        id: "choose-font",
                        selector: "#pref-font-picker",
                        titleKey:
                            "ui.tutorial.settings.appearance.choose.font.title",
                        bodyKey:
                            "ui.tutorial.settings.appearance.choose.font.body",
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
                        highlightNext: true,
                        id: "available-languages",
                        selector: "#available-languages",
                        titleKey:
                            "ui.tutorial.settings.language.available.languages.title",
                        bodyKey:
                            "ui.tutorial.settings.language.available.languages.body",
                    },
                    {
                        highlightNext: true,
                        id: "language-priority",
                        selector: "#preferred-languages",
                        titleKey:
                            "ui.tutorial.settings.language.language.priority.title",
                        bodyKey:
                            "ui.tutorial.settings.language.language.priority.body",
                    },
                    {
                        highlightNext: true,
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
                        highlightNext: true,
                        id: "time-zone",
                        selector: "#pref-timezone-select",
                        titleKey:
                            "ui.tutorial.settings.datetime.time.zone.title",
                        bodyKey: "ui.tutorial.settings.datetime.time.zone.body",
                    },
                    {
                        highlightNext: true,
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
                        highlightNext: true,
                        id: "preference-data",
                        selector: "#prefs-dump",
                        titleKey:
                            "ui.tutorial.settings.advanced.preference.data.title",
                        bodyKey:
                            "ui.tutorial.settings.advanced.preference.data.body",
                    },
                    {
                        highlightNext: true,
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
