export async function mountProvider(ctx) {
    const owner = ctx.capabilities
        .get("ui:tutorials")
        .owner("module.fixture", { signal: ctx.signal });
    try {
        await owner.register({
            version: 1,
            id: "introduction",
            page: "/administration/modules",
            titleKey: "ui.reuse.modules",
            steps: [{ id: "overview", titleKey: "ui.reuse.modules" }],
        });
        ctx.capabilities.contribute("fixture:repaired", () => true);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
