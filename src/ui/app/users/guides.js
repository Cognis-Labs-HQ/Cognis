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
                        highlightNext: true,
                        id: "account-directory",
                        selector: "#users-table",
                        titleKey:
                            "ui.tutorial.users.directory.account.directory.title",
                        bodyKey:
                            "ui.tutorial.users.directory.account.directory.body",
                    },
                    {
                        highlightNext: true,
                        id: "roles-and-access",
                        selector: ".users-role-select:not(:disabled)",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.users.directory.roles.and.access.title",
                        bodyKey:
                            "ui.tutorial.users.directory.roles.and.access.body",
                    },
                    {
                        highlightNext: true,
                        id: "account-actions",
                        selector: ".users-menu-btn:not(:disabled)",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.users.directory.account.actions.title",
                        bodyKey:
                            "ui.tutorial.users.directory.account.actions.body",
                    },
                    {
                        highlightNext: true,
                        id: "find-account",
                        selector: "#users-input",
                        titleKey:
                            "ui.tutorial.users.directory.find.account.title",
                        bodyKey:
                            "ui.tutorial.users.directory.find.account.body",
                    },
                ],
            },
        ],
        minRole: "admin",
    },
];
