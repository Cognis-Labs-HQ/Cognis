/** Register guarded SPA redraws without changing the URL, history or browser document. */
export function registerPageRedraw(
    ctx,
    { currentPath, resolveRoute, allowOfflineRoute, requestNavigation, mount },
) {
    if (ctx.capabilities.get("ui:redraw")) return;
    ctx.registerFlow("ui:redraw", ["validate", "prepare", "mount"]);
    const redraw = ({
        path = currentPath(),
        prepare,
        bypassGuard = false,
    } = {}) =>
        ctx
            .runFlow("ui:redraw", { path, prepare, bypassGuard })
            .then((result) => result.data.result === true);
    ctx.extendFlow(
        "ui:redraw",
        "validate",
        { id: "ui:pageRedraw" },
        async ({ input, data }) => {
            const route = await resolveRoute(input.path);
            data.allowed = currentPath() === input.path && Boolean(route);
            if (data.allowed)
                data.allowed = await allowOfflineRoute(route, input.path);
            if (data.allowed && !input.bypassGuard)
                data.allowed = requestNavigation(input.path, () => {
                    void redraw({ ...input, bypassGuard: true });
                });
        },
    );
    ctx.extendFlow(
        "ui:redraw",
        "prepare",
        { id: "ui:pageRedraw" },
        async ({ input, data }) => {
            if (data.allowed) data.rollback = await input.prepare?.();
        },
    );
    ctx.extendFlow(
        "ui:redraw",
        "mount",
        { id: "ui:pageRedraw" },
        async ({ input, data }) => {
            try {
                data.result =
                    data.allowed && currentPath() === input.path
                        ? await mount(input.path)
                        : false;
            } finally {
                if (!data.result && typeof data.rollback === "function")
                    data.rollback();
            }
        },
    );
    ctx.capabilities.contribute("ui:redraw", redraw);
}
