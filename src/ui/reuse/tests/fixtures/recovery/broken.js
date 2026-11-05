export async function mountProvider(ctx) {
    const owner = ctx.capabilities.get("ui:tutorials").owner("module.fixture", {
        signal: ctx.signal,
        i18n: {
            t() {
                throw new Error("unexpected_translation");
            },
        },
    });
    try {
        await owner.register({
            version: 1,
            id: "introduction",
            titleKey: "fixture.title",
            steps: [{ id: "overview", titleKey: "fixture.title" }],
        });
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
