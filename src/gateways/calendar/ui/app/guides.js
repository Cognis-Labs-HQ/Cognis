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
                        highlightNext: true,
                        id: "calendars",
                        selector: "#calendar-toolbar-list",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.calendars.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.calendars.body",
                    },
                    {
                        highlightNext: true,
                        id: "calendar-views",
                        selector: ".calendar-view-switcher",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.calendar.views.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.calendar.views.body",
                    },
                    {
                        highlightNext: true,
                        id: "events-and-invitations",
                        selector: ".calendar-view-canvas",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.events.and.invitations.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.events.and.invitations.body",
                    },
                    {
                        highlightNext: true,
                        id: "navigate-dates",
                        selector: ".calendar-view-nav",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.navigate.dates.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.navigate.dates.body",
                    },
                    {
                        highlightNext: true,
                        id: "plan-event",
                        selector: "[data-month-create-date], [data-slot-start]",
                        targetMatch: "first",
                        titleKey:
                            "gateway.calendar.tutorial.calendar.plan.event.title",
                        bodyKey:
                            "gateway.calendar.tutorial.calendar.plan.event.body",
                    },
                    {
                        highlightNext: true,
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
