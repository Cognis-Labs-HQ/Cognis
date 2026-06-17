import { registerApiRoutes, registerUi } from "./api/index.js";
import { MEETINGS_FLOW_CATALOG, registerCanonicalFlow } from "@cognis/core";

export function bootstrapModule(ctx) {
    registerUi(ctx);
    registerApiRoutes(ctx.router, ctx);

    const systemCtx = ctx.getCapability("system:ctx");
    if (systemCtx) {
        systemCtx.contributePublicCapability(
            "meetings:isProviderAvailable",
            (providerId) => providerId === "jitsi-meet",
        );

        /**
         * URL of the classroom meeting embed UI script served by this module.
         * Consumed by the Study classes adapter to inject a meta tag so the
         * classroom page can dynamically import the factory without a
         * hardcoded static import.
         */
        systemCtx.contributePublicCapability(
            "meetings:classroomEmbedScriptUrl",
            "/static/modules/jitsi-meet/classroom-meeting-embed.js",
        );
        systemCtx.contributePublicCapability(
            "jitsi:activeMeetingsUrl",
            "/api/v1/modules/jitsi-meet/meetings/active",
        );
        for (const flow of MEETINGS_FLOW_CATALOG) {
            registerCanonicalFlow(systemCtx, flow);
        }
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
}
