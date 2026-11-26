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
                        highlightNext: true,
                        id: "invite-options",
                        selector: "#invite-email-btn,#invite-token-btn",
                        targetMatch: "first",
                        titleKey:
                            "gateway.registration.tutorial.invitations.invite.options.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.invite.options.body",
                    },
                    {
                        highlightNext: true,
                        id: "invitation-history",
                        selector: ".users-table-wrap",
                        titleKey:
                            "gateway.registration.tutorial.invitations.invitation.history.title",
                        bodyKey:
                            "gateway.registration.tutorial.invitations.invitation.history.body",
                    },
                    {
                        highlightNext: true,
                        id: "manage-issued-invitations",
                        selector: ".invite-revoke-btn:not(:disabled)",
                        targetMatch: "first",
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
