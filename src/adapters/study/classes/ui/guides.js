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
                        selector: ".classes-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.class.membership.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.class.membership.body",
                    },
                    {
                        highlightNext: false,
                        id: "teaching-and-management",
                        selector: ".classes-manage-btn:not(:disabled)",
                        targetMatch: "first",
                        interaction: "target",
                        suppressHover: true,
                        advance: { event: "click" },
                        group: "manage-class",
                        titleKey:
                            "module.study.classes.tutorial.classes.teaching.and.management.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.teaching.and.management.body",
                    },
                    {
                        highlightNext: true,
                        id: "review-enrollment",
                        selector:
                            ".classes-manage-panel .classes-member-list:last-of-type",
                        targetMatch: "first",
                        missing: { timeoutMs: 15000, action: "skip" },
                        group: "manage-class",
                        dependsOn: ["teaching-and-management"],
                        titleKey:
                            "module.study.classes.tutorial.classes.review.enrollment.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.review.enrollment.body",
                    },
                ],
                visibleWhen: ".classes-filter-row",
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
