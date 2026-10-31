/** Host-owned example. Feature knowledge belongs here, never in the tutorial engine. */
export async function mountProvider(ctx) {
    const owner = ctx.capabilities
        .get("ui:tutorials")
        .owner("ui.workspace", { signal: ctx.signal });
    const selectors = {
        navigation: ".topnav",
        search: "#global-search-wrap",
        account: "#profile-toggle",
        workspace: ".main-window",
    };
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
            id: "welcome",
            titleKey: "ui.tutorial.workspace.title",
            available: () =>
                ctx.capabilities.get("session:isAuthenticated")?.() === true,
            steps: ["navigation", "search", "account"].map((name) => ({
                id: name,
                route: "/dashboard",
                target: `ui.workspace:${name}`,
                titleKey: `ui.tutorial.workspace.${name}.title`,
                bodyKey: `ui.tutorial.workspace.${name}.body`,
                effects: { callout: true, arrow: true, spotlight: true },
                missing: { timeoutMs: 3000, action: "skip" },
            })),
        });
        ctx.capabilities.contribute("ui:workspaceTutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
