export function mountProvider(ctx) {
    return ctx.capabilities.contribute("example:value", "ready");
}
