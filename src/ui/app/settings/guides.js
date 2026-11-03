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
                        id: "step1",
                        selector: "#email-list",
                        titleKey: "ui.tutorial.settings.general.step1.title",
                        bodyKey: "ui.tutorial.settings.general.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#pref-offline-enabled",
                        titleKey: "ui.tutorial.settings.general.step2.title",
                        bodyKey: "ui.tutorial.settings.general.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".settings-danger-zone",
                        titleKey: "ui.tutorial.settings.general.step3.title",
                        bodyKey: "ui.tutorial.settings.general.step3.body",
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
                        id: "step1",
                        selector: "#pref-font-picker",
                        titleKey: "ui.tutorial.settings.appearance.step1.title",
                        bodyKey: "ui.tutorial.settings.appearance.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#pref-theme-selector",
                        titleKey: "ui.tutorial.settings.appearance.step2.title",
                        bodyKey: "ui.tutorial.settings.appearance.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#pref-message-style-selector",
                        titleKey: "ui.tutorial.settings.appearance.step3.title",
                        bodyKey: "ui.tutorial.settings.appearance.step3.body",
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
                        id: "step1",
                        selector: "#available-languages",
                        titleKey: "ui.tutorial.settings.language.step1.title",
                        bodyKey: "ui.tutorial.settings.language.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#preferred-languages",
                        titleKey: "ui.tutorial.settings.language.step2.title",
                        bodyKey: "ui.tutorial.settings.language.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#pref-language-sync-from-browser",
                        titleKey: "ui.tutorial.settings.language.step3.title",
                        bodyKey: "ui.tutorial.settings.language.step3.body",
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
                        id: "step1",
                        selector: "#pref-timezone-select",
                        titleKey: "ui.tutorial.settings.datetime.step1.title",
                        bodyKey: "ui.tutorial.settings.datetime.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#pref-time-format-select",
                        titleKey: "ui.tutorial.settings.datetime.step2.title",
                        bodyKey: "ui.tutorial.settings.datetime.step2.body",
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
                        id: "step1",
                        selector: "#prefs-dump",
                        titleKey: "ui.tutorial.settings.advanced.step1.title",
                        bodyKey: "ui.tutorial.settings.advanced.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#advanced",
                        titleKey: "ui.tutorial.settings.advanced.step2.title",
                        bodyKey: "ui.tutorial.settings.advanced.step2.body",
                    },
                ],
                scope: "#advanced",
            },
        ],
    },
];
