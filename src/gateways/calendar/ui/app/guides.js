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
                        id: "calendars",
                        selector: "#calendar-toolbar-list",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.calendars.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.calendars.body",
                    },
                    {
                        id: "calendar-views",
                        selector: ".calendar-view-switcher",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.calendar.views.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.calendar.views.body",
                    },
                    {
                        id: "events-and-invitations",
                        selector: ".calendar-view-canvas",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.events.and.invitations.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.events.and.invitations.body",
                    },
                ],
            },
        ],
    },
];
