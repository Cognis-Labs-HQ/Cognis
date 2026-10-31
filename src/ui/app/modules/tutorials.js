/** Public target publisher for module cards owned by the host Modules page. */
export async function mountProvider(ctx) {
    const owner = ctx.capabilities
        .get("ui:tutorials")
        .owner("ui.modules", { signal: ctx.signal });
    ctx.capabilities.contribute("ui:moduleTutorialTargets", {
        async card(id, { signal }) {
            if (!/^[a-z][a-z0-9-]{0,70}$/.test(id))
                throw new TypeError("invalid_module_id");
            return owner.target(id, {
                public: true,
                signal,
                resolve: () => {
                    const matches = document.querySelectorAll(
                        `[data-tutorial-module="${id}"]`,
                    );
                    return matches.length === 1 ? matches[0] : null;
                },
            });
        },
    });
    return owner.dispose;
}
