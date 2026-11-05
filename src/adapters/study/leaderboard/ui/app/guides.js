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
                        id: "ranking-selection",
                        selector: "[data-leaderboard-definition]",
                        titleKey:
                            "adapter.study.leaderboard.tutorial.rankings.ranking.selection.title",
                        bodyKey:
                            "adapter.study.leaderboard.tutorial.rankings.ranking.selection.body",
                    },
                    {
                        id: "scores-and-movement",
                        selector: ".leaderboard-table-scroll",
                        titleKey:
                            "adapter.study.leaderboard.tutorial.rankings.scores.and.movement.title",
                        bodyKey:
                            "adapter.study.leaderboard.tutorial.rankings.scores.and.movement.body",
                    },
                    {
                        id: "compare-progress",
                        selector: ".leaderboard-table-scroll",
                        titleKey:
                            "adapter.study.leaderboard.tutorial.rankings.compare.progress.title",
                        bodyKey:
                            "adapter.study.leaderboard.tutorial.rankings.compare.progress.body",
                    },
                ],
            },
        ],
    },
];
