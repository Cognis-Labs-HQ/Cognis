import type { Ctx } from "@cognis/core";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
    StudyClassAccessCapability,
} from "../../../gateways/study/gateway.js";
import { createProgressRoutes } from "./routes/index.js";
import { ProgressService } from "./service.js";
import { MemoryProgressStore } from "./store.js";

let adapterReady = false;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "progress",
        adapterName: "Progress",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => adapterReady,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    if (!systemCtx) {
        await ctx.log?.(
            "error",
            "Study/progress adapter requires the system context.",
            {
                component: "study-progress",
                operation: "bootstrap",
                fatal: true,
            },
        );
        return;
    }
    if (!systemCtx.hasFlow("study:progress:recordEvent")) {
        systemCtx.registerFlow({
            id: "study:progress:recordEvent",
            description:
                "Validates, observes, and records an immutable learning event.",
            stages: ["authorize", "validate", "observe", "persist", "project"],
        });
    }
    const service = new ProgressService(
        new MemoryProgressStore(),
        ctx.capabilities.get<StudyClassAccessCapability>(
            "study:classes:access",
        ),
        ctx.flow,
        ctx.log,
    );
    ctx.capabilities.contribute("study:progress", service);
    ctx.registerRoute(
        createProgressRoutes(
            service,
            ctx.capabilities.get<RouteContext>("auth:routeContext"),
            ctx.log,
        ),
        "study",
    );
    adapterReady = true;
    await ctx.log?.("info", "Study/progress adapter bootstrapped.", {
        component: "study-progress",
        operation: "bootstrap",
    });
}
