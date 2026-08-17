import { registerApiRoutes, registerUi } from "./api/index.js";
import { registerShareFlowHooks } from "./api/share-hooks.js";

const MEETINGS_FLOW_CATALOG = [
    {
        id: "construct-meetings-ui",
        description: "Build the meetings UI from provider contributions.",
        stages: ["resolve-providers", "resolve-panels", "compose-surface"],
    },
    {
        id: "create-meeting",
        description: "Create or join a meeting through the selected provider.",
        stages: ["validate-request", "provision-session", "finalize-join"],
    },
];

export function bootstrapModule(ctx) {
    registerUi(ctx);
    registerApiRoutes(ctx.router, ctx);

    ctx.contributePublicCapability(
        "meetings:isProviderAvailable",
        (providerId) => providerId === "jitsi-meet",
    );
    for (const flow of MEETINGS_FLOW_CATALOG) {
        if (!ctx.flow.exists(flow.id)) ctx.registerFlow(flow);
    }

    ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "jitsi-meet-module:bootstrap-registration" },
        () => ({
            moduleId: "jitsi-meet",
            registeredFlowIds: MEETINGS_FLOW_CATALOG.map((f) => f.id),
        }),
    );

    ctx.flow.extend(
        "construct-meetings-ui",
        "resolve-providers",
        { id: "jitsi-meet-module:resolve-providers" },
        () => ({
            providerId: "jitsi-meet",
            providerName: "Jitsi Meet",
            scriptUrl: "/static/modules/jitsi-meet/app.js",
        }),
    );

    ctx.flow.extend(
        "create-meeting",
        "validate-request",
        { id: "jitsi-meet-module:validate-request" },
        (stageCtx) => {
            const input = stageCtx.input;
            const providerId = String(input.providerId ?? "jitsi-meet");
            if (providerId !== "jitsi-meet") {
                return { valid: false, reason: "unsupported_provider" };
            }
            return { valid: true, providerId };
        },
    );

    registerShareFlowHooks(ctx);
}
