/** External-module-shaped consumer: only public ctx capabilities and an owned content root. */
export async function mountProvider(ctx) {
    const api = ctx.capabilities.get("ui:tutorials");
    const owner = api.owner("module.fixture", {
        signal: ctx.signal,
        i18n: { t: (key) => key },
    });
    try {
        const target = await owner.target("content", {
            resolve: () => ctx.capabilities.get("fixture:contentRoot"),
        });
        const play = await owner.register({
            version: 1,
            id: "overview",
            titleKey: "module.fixture.overview",
            steps: [
                {
                    id: "inspect",
                    target: target.id,
                    titleKey: "module.fixture.inspect",
                    effects: { arrow: true, spotlight: true },
                },
            ],
        });
        ctx.capabilities.contribute("fixture:tutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
