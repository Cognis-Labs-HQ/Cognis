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
                        id: "step1",
                        selector: "#users-table",
                        titleKey: "ui.tutorial.users.directory.step1.title",
                        bodyKey: "ui.tutorial.users.directory.step1.body",
                    },
                    {
                        id: "step2",
                        selector: ".users-list",
                        titleKey: "ui.tutorial.users.directory.step2.title",
                        bodyKey: "ui.tutorial.users.directory.step2.body",
                    },
                    {
                        id: "step3",
                        selector: ".users-list",
                        titleKey: "ui.tutorial.users.directory.step3.title",
                        bodyKey: "ui.tutorial.users.directory.step3.body",
                    },
                ],
            },
        ],
        minRole: "admin",
    },
];
