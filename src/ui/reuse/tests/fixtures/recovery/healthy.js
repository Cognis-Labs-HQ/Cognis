export function mountProvider(ctx) {
    ctx.capabilities.contribute("fixture:healthy", () => true);
}
