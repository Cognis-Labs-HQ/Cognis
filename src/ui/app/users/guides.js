export const guides = [
    {
        owner: "ui.users",
        definitions: [
            {
                id: "directory",
                page: "/users",
                titleKey: "ui.tutorial.users.directory.title",
                steps: [
                    {
                        id: "account-directory",
                        selector: "#users-table",
                        titleKey:
                            "ui.tutorial.users.directory.account.directory.title",
                        bodyKey:
                            "ui.tutorial.users.directory.account.directory.body",
                    },
                    {
                        id: "roles-and-access",
                        selector: ".users-list",
                        titleKey:
                            "ui.tutorial.users.directory.roles.and.access.title",
                        bodyKey:
                            "ui.tutorial.users.directory.roles.and.access.body",
                    },
                    {
                        id: "account-actions",
                        selector: ".users-list",
                        titleKey:
                            "ui.tutorial.users.directory.account.actions.title",
                        bodyKey:
                            "ui.tutorial.users.directory.account.actions.body",
                    },
                ],
            },
        ],
        minRole: "admin",
    },
];
