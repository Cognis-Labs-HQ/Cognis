export const guides = [
    {
        owner: "ui.changelogs",
        definitions: [
            {
                id: "releases",
                page: ({ pathname }) => /^\/changelogs(?:\/|$)/.test(pathname),
                titleKey: "ui.tutorial.changelogs.releases.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#doc",
                        titleKey: "ui.tutorial.changelogs.releases.step1.title",
                        bodyKey: "ui.tutorial.changelogs.releases.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#doc",
                        titleKey: "ui.tutorial.changelogs.releases.step2.title",
                        bodyKey: "ui.tutorial.changelogs.releases.step2.body",
                    },
                ],
            },
        ],
    },
];
