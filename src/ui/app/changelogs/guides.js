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
                        id: "release-changes",
                        selector: "#doc",
                        titleKey:
                            "ui.tutorial.changelogs.releases.release.changes.title",
                        bodyKey:
                            "ui.tutorial.changelogs.releases.release.changes.body",
                    },
                    {
                        id: "compare-releases",
                        selector: "#doc",
                        titleKey:
                            "ui.tutorial.changelogs.releases.compare.releases.title",
                        bodyKey:
                            "ui.tutorial.changelogs.releases.compare.releases.body",
                    },
                ],
            },
        ],
    },
];
