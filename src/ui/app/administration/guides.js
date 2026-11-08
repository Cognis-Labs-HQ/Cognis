/** Keep a component detail branch bound to the selected row for its lifetime. */
function selectComponent({ target, sessionSignal }) {
    const row = target.closest("details.module-row");
    row.setAttribute("data-tutorial-component", "");
    sessionSignal.addEventListener(
        "abort",
        () => row.removeAttribute("data-tutorial-component"),
        { once: true },
    );
}

/** Own the settings surface until Back, Restart or completion releases the branch. */
function ownSettings({ target, groupSignal, ctx }) {
    ctx.capabilities
        .get("ui:transientSurfaces")
        .attachLifetime(
            target.closest("[data-component-settings-popup]"),
            groupSignal,
        );
}

export const guides = [
    {
        owner: "ui.administration",
        definitions: [
            {
                id: "components",
                page: "/administration",
                titleKey: "ui.tutorial.admin.components.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "enable-and-disable",
                        enter: ({ target }) => {
                            for (const row of target
                                .closest("#components")
                                .querySelectorAll("[data-tutorial-component]"))
                                row.removeAttribute("data-tutorial-component");
                        },
                        selector:
                            ".module-row-controls>.switch--inline:has(input[type='checkbox']:not(:disabled))",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.admin.components.enable.and.disable.title",
                        bodyKey:
                            "ui.tutorial.admin.components.enable.and.disable.body",
                    },
                    {
                        highlightNext: false,
                        id: "gateways-and-adapters",
                        interaction: "target",
                        group: "component-details",
                        enter: selectComponent,
                        advance: {
                            event: "click",
                            accept: (event) =>
                                event.target.closest("details.module-row")
                                    ?.open === true,
                        },
                        selector: ".module-row-summary>[data-details-toggle]",
                        targetMatch: "first",
                        titleKey:
                            "ui.tutorial.admin.components.gateways.and.adapters.title",
                        bodyKey:
                            "ui.tutorial.admin.components.gateways.and.adapters.body",
                    },
                    {
                        highlightNext: true,
                        id: "component-metadata",
                        selector:
                            "[data-tutorial-component][open]>.module-meta>.module-details",
                        group: "component-details",
                        dependsOn: ["gateways-and-adapters"],
                        titleKey: "ui.tutorial.admin.components.metadata.title",
                        bodyKey: "ui.tutorial.admin.components.metadata.body",
                    },
                    {
                        highlightNext: false,
                        id: "configuration",
                        selector:
                            ".module-row[data-tutorial-component][open] .adapter-inline-summary>.collapsible-section-title",
                        targetMatch: "first",
                        when: ({ targetAvailable }) => targetAvailable,
                        interaction: "target",
                        group: "component-settings",
                        dependsOn: ["gateways-and-adapters"],
                        popup: "[data-component-settings-popup]",
                        advance: {
                            event: "click",
                            accept: (event) =>
                                Boolean(
                                    event.target
                                        .closest(".adapter-inline-summary")
                                        ?.closest(
                                            "[data-tutorial-component][open]",
                                        ),
                                ),
                        },
                        titleKey:
                            "ui.tutorial.admin.components.configuration.title",
                        bodyKey:
                            "ui.tutorial.admin.components.configuration.body",
                    },
                    {
                        highlightNext: true,
                        id: "settings-fields",
                        selector: ".provider-fields",
                        portal: "[data-component-settings-popup]",
                        popup: "[data-component-settings-popup]",
                        layer: "overlay",
                        interaction: "target",
                        group: "component-settings",
                        dependsOn: ["configuration"],
                        missing: { timeoutMs: 15000, action: "skip" },
                        enter: ownSettings,
                        titleKey:
                            "ui.tutorial.admin.components.settings.fields.title",
                        bodyKey:
                            "ui.tutorial.admin.components.settings.fields.body",
                    },
                    {
                        highlightNext: true,
                        id: "settings-actions",
                        selector: ".popup-footer",
                        portal: "[data-component-settings-popup]",
                        popup: "[data-component-settings-popup]",
                        layer: "overlay",
                        group: "component-settings",
                        dependsOn: ["configuration"],
                        titleKey:
                            "ui.tutorial.admin.components.settings.actions.title",
                        bodyKey:
                            "ui.tutorial.admin.components.settings.actions.body",
                    },
                ],
                scope: "#components",
            },
            {
                id: "status",
                page: "/administration",
                titleKey: "ui.tutorial.admin.status.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "health-and-integrity",
                        selector: "[data-component-health]",
                        titleKey:
                            "ui.tutorial.admin.status.health.and.integrity.title",
                        bodyKey:
                            "ui.tutorial.admin.status.health.and.integrity.body",
                    },
                    {
                        highlightNext: true,
                        id: "file-integrity",
                        selector: "[data-component-integrity]",
                        titleKey:
                            "ui.tutorial.admin.status.file.integrity.title",
                        bodyKey: "ui.tutorial.admin.status.file.integrity.body",
                    },
                    {
                        highlightNext: true,
                        id: "refresh-checks",
                        selector: "#rerun-status",
                        titleKey:
                            "ui.tutorial.admin.status.refresh.checks.title",
                        bodyKey: "ui.tutorial.admin.status.refresh.checks.body",
                    },
                ],
                scope: "#status",
            },
            {
                id: "security",
                page: "/administration",
                titleKey: "ui.tutorial.admin.security.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "session-policy",
                        selector: "#security-login-session-timeout",
                        titleKey:
                            "ui.tutorial.admin.security.session.policy.title",
                        bodyKey:
                            "ui.tutorial.admin.security.session.policy.body",
                    },
                    {
                        highlightNext: true,
                        id: "trusted-domains",
                        selector: "#security-trusted-domains",
                        titleKey:
                            "ui.tutorial.admin.security.trusted.domains.title",
                        bodyKey:
                            "ui.tutorial.admin.security.trusted.domains.body",
                    },
                ],
                scope: "#security",
            },
        ],
        minRole: "admin",
    },
];
