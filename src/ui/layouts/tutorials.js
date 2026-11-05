/** Workspace walkthrough. Each interactive exercise uses the shell's real controls. */
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
        account: "#profile-toggle",
        widgets: ".main-window",
        replay: ".page-context",
    };
    const steps = [
        { id: "navigation" },
        {
            id: "search",
            interaction: "target",
            advance: { event: "click" },
            enter({ signal, groupSignal, target }) {
                const popup = ctx.capabilities.get("ui:searchPopup");
                if (typeof popup?.attachLifetime !== "function")
                    throw new Error("search_popup_unavailable");
                target.addEventListener(
                    "click",
                    () => {
                        popup.attachLifetime(groupSignal);
                    },
                    { signal },
                );
            },
        },
        {
            id: "query",
            interaction: "target",
            layer: "overlay",
            advance: {
                event: "input",
                accept: (event) => event.target.value.trim().length >= 2,
            },
        },
        { id: "options", interaction: "target", layer: "overlay" },
        { id: "results", layer: "overlay" },
        {
            id: "close",
            interaction: "target",
            layer: "overlay",
            advance: { event: "click" },
        },
        { id: "notifications" },
        { id: "account" },
        { id: "widgets" },
        { id: "replay" },
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
                ...(["search", "query", "options", "results", "close"].includes(
                    step.id,
                )
                    ? { group: "finder" }
                    : {}),
                route: "/dashboard",
                target: `ui.workspace:${step.id}`,
                titleKey: ["navigation", "search"].includes(step.id)
                    ? `ui.reuse.${step.id}`
                    : `ui.tutorial.workspace.${step.id}.title`,
                bodyKey: `ui.tutorial.workspace.${step.id}.body`,
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
