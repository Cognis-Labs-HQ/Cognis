import { registerApiRoutes, registerUi } from "./api/index.js";
import { MEETINGS_FLOW_CATALOG, registerCanonicalFlow } from "@cognis/core";

export function bootstrapModule(ctx) {
    registerUi(ctx);
    registerApiRoutes(ctx.router, ctx);

    const flowCtx = ctx.getCapability("system:ctx");
    if (!flowCtx) return;

    for (const flow of MEETINGS_FLOW_CATALOG) {
        registerCanonicalFlow(flowCtx, flow);
    }

    flowCtx.addFlowStageHook(
        "bootstrap-platform",
        "register-flows",
        { id: "jitsi-meet-module:bootstrap-registration" },
        () => ({
            moduleId: "jitsi-meet",
            registeredFlowIds: MEETINGS_FLOW_CATALOG.map((f) => f.id),
        }),
    );

    flowCtx.addFlowStageHook(
        "construct-meetings-ui",
        "resolve-providers",
        { id: "jitsi-meet-module:resolve-providers" },
        () => ({
            providerId: "jitsi-meet",
            providerName: "Jitsi Meet",
            scriptUrl: "/static/modules/jitsi-meet/app.js",
        }),
    );

    flowCtx.addFlowStageHook(
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
}
