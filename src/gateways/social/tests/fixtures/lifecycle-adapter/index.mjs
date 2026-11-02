export function createSocialAdapter() {
    return { adapterId: "messages", adapterName: "Messages" };
}

export function defineContracts(ctx) {
    ctx.capabilities.require("system:contracts").define("social:fixtureReady", {
        version: 1,
        kind: "function",
        description: "Reports readiness of this fixture provider.",
    });
}

export function bootstrapSocialAdapter(ctx) {
    ctx.capabilities
        .require("system:ctx")
        .contributePublicCapability("social:fixtureReady", () => true);
    ctx.registerRoute(async () => false, "social");
}
