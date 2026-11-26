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
                        highlightNext: true,
                        id: "password-changes",
                        selector: "#auth-security-reset-panel",
                        titleKey:
                            "gateway.auth.tutorial.security.password.changes.title",
                        bodyKey:
                            "gateway.auth.tutorial.security.password.changes.body",
                    },
                    {
                        highlightNext: true,
                        id: "session-duration",
                        selector: "#settings-login-session-timeout",
                        titleKey:
                            "gateway.auth.tutorial.security.session.duration.title",
                        bodyKey:
                            "gateway.auth.tutorial.security.session.duration.body",
                    },
                ],
                scope: "#auth-security-reset-panel",
            },
        ],
    },
];
