/** Workspace walkthrough. Each interactive exercise uses the shell's real controls. */
import { usableTarget } from "../reuse/tutorials/targets.js";

export async function mountProvider(ctx) {
    const owner = ctx.capabilities
        .get("ui:tutorials")
        .owner("ui.workspace", { signal: ctx.signal });
    const selectors = {
        navigation: ".topnav",
        search: "#global-search-wrap>.search-bar-wrap>.search-bar-toggle",
        query: ".search-popup-input",
        options: ".search-popup-options",
        results: ".search-popup-results",
        close: ".search-popup-close",
        notifications: "#notification-toggle",
        "notification-pane": ".notification-panel",
        account: "#profile-toggle",
        "account-options": "#profile-dropdown",
        "account-administration":
            "#profile-dropdown>li>a[href='/administration']",
        "account-logout": "#profile-logout",
        dock: "[data-page-action-dock]",
        "dock-language": "#language-toggle",
        "dock-theme": "#theme-toggle",
        "dock-layout": "#composer-edit-toggle",
        widgets: ".main-window",
        replay: ".page-context .tutorial-help",
    };
    const attachOpenedSurface =
        (selector) =>
        ({ signal, groupSignal, target }) => {
            const surfaces = ctx.capabilities.get("ui:transientSurfaces");
            if (typeof surfaces?.attachLifetime !== "function")
                throw new Error("transient_surfaces_unavailable");
            target.addEventListener(
                "click",
                () => {
                    const surface = document.querySelector(selector);
                    if (surface) surfaces.attachLifetime(surface, groupSignal);
                },
                { signal },
            );
        };
    const steps = [
        {
            highlightNext: true,
            id: "navigation",
        },
        {
            highlightNext: false,
            id: "search",
            interaction: "target",
            advance: { event: "click" },
            enter: attachOpenedSurface(".search-popup-overlay"),
        },
        {
            highlightNext: false,
            id: "query",
            dependsOn: ["search"],
            interaction: "target",
            layer: "overlay",
            advance: {
                event: "input",
                accept: (event) => event.target.value.trim().length >= 2,
            },
        },
        {
            highlightNext: false,
            id: "options",
            dependsOn: ["search"],
            interaction: "target",
            layer: "overlay",
            advance: {
                event: "click",
                accept: (event) =>
                    Boolean(event.target.closest?.(".search-popup-option")),
            },
        },
        {
            highlightNext: true,
            id: "results",
            dependsOn: ["search"],
            layer: "overlay",
        },
        {
            highlightNext: false,
            id: "close",
            dependsOn: ["search"],
            interaction: "target",
            layer: "overlay",
            advance: { event: "click" },
        },
        {
            highlightNext: false,
            id: "notifications",
            group: "inbox",
            interaction: "target",
            suppressHover: true,
            advance: { event: "click" },
            enter: attachOpenedSurface(".notification-panel"),
        },
        {
            highlightNext: true,
            id: "notification-pane",
            dependsOn: ["notifications"],
            group: "inbox",
            titleKey: "ui.reuse.notifications",
        },
        {
            highlightNext: false,
            id: "account",
            group: "account-menu",
            interaction: "target",
            suppressHover: true,
            advance: { event: "click" },
            enter: attachOpenedSurface("#profile-dropdown"),
        },
        {
            highlightNext: true,
            id: "account-options",
            dependsOn: ["account"],
            group: "account-menu",
        },
        {
            highlightNext: true,
            id: "account-administration",
            minRole: "admin",
            dependsOn: ["account"],
            group: "account-menu",
            titleKey: "ui.reuse.administration",
        },
        {
            highlightNext: true,
            id: "account-logout",
            dependsOn: ["account"],
            group: "account-menu",
        },
        {
            highlightNext: true,
            id: "dock",
            titleKey: "ui.reuse.actions",
        },
        {
            highlightNext: true,
            id: "dock-language",
            titleKey: "ui.reuse.language",
        },
        {
            highlightNext: true,
            id: "dock-theme",
            titleKey: "ui.reuse.appearance",
        },
        {
            highlightNext: true,
            id: "dock-layout",
        },
        {
            highlightNext: true,
            id: "widgets",
        },
        {
            highlightNext: true,
            id: "replay",
        },
    ];
    try {
        for (const [name, selector] of Object.entries(selectors))
            await owner.target(name, {
                public: true,
                resolve: () => {
                    const matches = document.querySelectorAll(selector);
                    return matches.length === 1 ? matches[0] : null;
                },
            });
        const play = await owner.register({
            version: 1,
            page: "/dashboard",
            id: "welcome",
            titleKey: "ui.tutorial.workspace.title",
            available: () =>
                ctx.capabilities.get("session:isAuthenticated")?.() === true,
            steps: steps.map((step) => ({
                ...step,
                ...(step.id.startsWith("dock") ||
                ["search", "notifications", "account"].includes(step.id)
                    ? {
                          when: () =>
                              usableTarget(
                                  document.querySelector(selectors[step.id]),
                                  document,
                              ),
                      }
                    : {}),
                ...(["search", "query", "options", "results", "close"].includes(
                    step.id,
                )
                    ? { group: "finder" }
                    : {}),
                route: "/dashboard",
                target: `ui.workspace:${step.id}`,
                titleKey:
                    step.titleKey ??
                    (["navigation", "search"].includes(step.id)
                        ? `ui.reuse.${step.id}`
                        : `ui.tutorial.workspace.${step.id.replaceAll("-", ".")}.title`),
                bodyKey: `ui.tutorial.workspace.${step.id.replaceAll("-", ".")}.body`,
                preventNavigation: true,
                effects: { callout: true, arrow: true, spotlight: true },
                missing: { timeoutMs: 1500, action: "skip" },
            })),
        });
        ctx.capabilities.contribute("ui:workspaceTutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
