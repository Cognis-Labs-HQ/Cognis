export const guides = [
    {
        owner: "study.leaderboard.page",
        definitions: [
            {
                id: "rankings",
                page: ({ pathname }) =>
                    /^\/study\/leaderboard(?:\/|$)/.test(pathname),
                titleKey: "adapter.study.leaderboard.tutorial.rankings.title",
                steps: [
                    {
                        id: "step1",
                        selector: "[data-leaderboard-definition]",
                        titleKey:
                            "adapter.study.leaderboard.tutorial.rankings.step1.title",
                        bodyKey:
                            "adapter.study.leaderboard.tutorial.rankings.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".leaderboard-table-scroll",
                        titleKey:
                            "adapter.study.leaderboard.tutorial.rankings.step2.title",
                        bodyKey:
                            "adapter.study.leaderboard.tutorial.rankings.step2.body",
                    },
                ],
            },
        ],
    },
];
