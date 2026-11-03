export const guides = [
    {
        owner: "registration.invites",
        definitions: [
            {
                id: "invitations",
                page: "/invite",
                titleKey: "gateway.registration.tutorial.invitations.title",
                steps: [
                    {
                        id: "step1",
                        selector: ".invite-actions",
                        titleKey:
                            "gateway.registration.tutorial.invitations.step1.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".users-table-wrap",
                        titleKey:
                            "gateway.registration.tutorial.invitations.step2.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.step2.body",
                    },
                ],
            },
        ],
    },
];
