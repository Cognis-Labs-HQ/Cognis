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
                        id: "invite-options",
                        selector: ".invite-actions",
                        titleKey:
                            "gateway.registration.tutorial.invitations.invite.options.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.invite.options.body",
                    },
                    {
                        id: "invitation-history",
                        selector: ".users-table-wrap",
                        titleKey:
                            "gateway.registration.tutorial.invitations.invitation.history.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.invitation.history.body",
                    },
                    {
                        id: "manage-issued-invitations",
                        selector: ".users-table-wrap",
                        titleKey:
                            "gateway.registration.tutorial.invitations.manage.issued.invitations.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.manage.issued.invitations.body",
                    },
                ],
            },
        ],
    },
];
