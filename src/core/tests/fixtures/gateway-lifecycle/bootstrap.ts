export async function bootstrap(
    ctx: import("../../../services/gateway-service.js").GatewayBootstrapBase,
) {
    ctx.gatewayRegistry.register({
        id: "example",
        name: "Example",
        version: "1.0.0",
    });
    await ctx.capabilities.require<() => Promise<void>>("fixture:bootstrap")();
}

export async function completeBootstrap(
    ctx: import("../../../services/gateway-service.js").GatewayBootstrapBase,
) {
    await ctx.capabilities.require<() => Promise<void>>("fixture:complete")();
}
