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
                    {
                        id: "navigate-dates",
                        selector: "#calendar-toolbar-summary",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.navigate.dates.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.navigate.dates.body",
                    },
                    {
                        id: "plan-event",
                        selector: ".calendar-view-canvas",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.plan.event.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.plan.event.body",
                    },
                    {
                        id: "review-upcoming",
                        selector: "#calendar-toolbar-upcoming",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.review.upcoming.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.review.upcoming.body",
                    },
                ],
            },
        ],
    },
];
