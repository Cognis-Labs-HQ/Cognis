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
                        id: "step1",
                        selector: ".classes-filter-row",
                        titleKey:
                            "module.study.classes.tutorial.classes.step1.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#class-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.step2.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.step2.body",
                    },
                    {
                        id: "step3",
                        selector: "#class-list",
                        titleKey:
                            "module.study.classes.tutorial.classes.step3.title",
                        bodyKey:
                            "module.study.classes.tutorial.classes.step3.body",
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
                        id: "step1",
                        selector: ".classes-enrolled-content",
                        titleKey:
                            "module.study.classes.tutorial.membership.step1.title",
                        bodyKey:
                            "module.study.classes.tutorial.membership.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".classes-available-content",
                        titleKey:
                            "module.study.classes.tutorial.membership.step2.title",
                        bodyKey:
                            "module.study.classes.tutorial.membership.step2.body",
                    },
                ],
            },
        ],
    },
];
