export const guides = [
    {
        owner: "study.classes.page",
        definitions: [
            {
                id: "classes",
                page: "/classes",
                titleKey: "module.study.classes.tutorial.classes.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "language-filter",
                        selector: ".classes-filter-row",
                        titleKey:
                            "module.study.classes.tutorial.classes.language.filter.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.language.filter.body",
                    },
                    {
                        highlightNext: true,
                        id: "class-membership",
                        selector: "#class-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.class.membership.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.class.membership.body",
                    },
                    {
                        highlightNext: true,
                        id: "teaching-and-management",
                        selector: "#class-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.teaching.and.management.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.teaching.and.management.body",
                    },
                    {
                        highlightNext: true,
                        id: "review-enrollment",
                        selector: "#class-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.review.enrollment.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.review.enrollment.body",
                    },
                ],
                scope: "#class-list",
            },
            {
                id: "membership",
                page: "/my-classes",
                titleKey: "ui.reuse.classes",
                steps: [
                    {
                        highlightNext: true,
                        id: "enrolled-classes",
                        selector: ".classes-enrolled-content",
                        titleKey:
                            "module.study.classes.tutorial.membership.enrolled.classes.title",
                        bodyKey:
                            "module.study.classes.tutorial.membership.enrolled.classes.body",
                    },
                    {
                        highlightNext: true,
                        id: "join-requests",
                        selector: ".classes-available-content",
                        titleKey:
                            "module.study.classes.tutorial.membership.join.requests.title",
                        bodyKey:
                            "module.study.classes.tutorial.membership.join.requests.body",
                    },
                ],
            },
        ],
    },
];
