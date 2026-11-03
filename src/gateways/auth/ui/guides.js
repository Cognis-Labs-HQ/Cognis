export const guides = [
    {
        owner: "auth.security.tutorials",
        definitions: [
            {
                id: "security",
                page: "/settings",
                titleKey: "gateway.auth.tutorial.security.title",
                steps: [
                    {
                        id: "step1",
                        selector: "#auth-security-reset-panel",
                        titleKey: "gateway.auth.tutorial.security.step1.title",
                        bodyKey: "gateway.auth.tutorial.security.step1.body",
                    },
                    {
                        id: "step2",
                        selector: "#settings-login-session-timeout",
                        titleKey: "gateway.auth.tutorial.security.step2.title",
                        bodyKey: "gateway.auth.tutorial.security.step2.body",
                    },
                ],
                scope: "#auth-security-reset-panel",
            },
        ],
    },
];
