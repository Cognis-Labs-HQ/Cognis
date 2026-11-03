export const guides = [
    {
        owner: "calendar.page",
        definitions: [
            {
                id: "calendar",
                page: "/calendar",
                titleKey: "gateway.calendar.tutorial.calendar.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#calendar-toolbar-list",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.step1.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".calendar-view-switcher",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.step2.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".calendar-view-canvas",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.step3.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.step3.body",
                    },
                ],
            },
        ],
    },
];
