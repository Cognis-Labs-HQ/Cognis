import type { Ctx, ScoringCapability } from "@cognis/core";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { LeaderboardService } from "./service.js";
import type { ProgressEvidenceCapability } from "./types.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { createLeaderboardRoutes } from "./routes/index.js";

let ready = false;
const UI_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "leaderboard",
        adapterName: "Leaderboard",
        requires: ["progress"],
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => ready,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    const progress =
        ctx.capabilities.get<ProgressEvidenceCapability>("study:progress");
    const scoring =
        ctx.capabilities.get<ScoringCapability>("engagement:scoring");
    if (!systemCtx || !progress || !scoring) {
        await ctx.log?.(
            "error",
            "Study/leaderboard requires the Study Progress capability.",
            { component: "study-leaderboard", fatal: true },
        );
        return;
    }
    for (const [id, description, stages] of [
        [
            "study:leaderboard:submitObservation",
            "Validate evidence and submit a leaderboard observation.",
            ["authorize", "validate", "verifyEvidence", "persist"],
        ],
        [
            "study:leaderboard:queryStandings",
            "Build privacy-safe leaderboard standings.",
            ["authorize", "select", "rank", "present"],
        ],
        [
            "study:leaderboard:rollover",
            "Archive and roll over a recurring leaderboard season.",
            ["close", "archive", "assignCohorts", "open"],
        ],
    ] as const)
        if (!systemCtx.hasFlow(id))
            systemCtx.registerFlow({ id, description, stages: [...stages] });
    const service = new LeaderboardService(
        progress,
        () => ctx.isAdapterEnabled(),
        scoring,
    );
    ctx.capabilities.contribute("study:leaderboard", service);
    systemCtx.contributePublicCapability("study:leaderboard", service);
    ctx.registerRoute(
        createLeaderboardRoutes(
            service,
            ctx.capabilities.get<RouteContext>("auth:routeContext"),
        ),
        "study",
    );
    ctx.registerAdapterStaticDir?.("study", "leaderboard", UI_ROOT);
    ctx.registerSpaRoute?.({
        id: "study-leaderboard-page",
        pattern: "^/study/leaderboard$",
        base: "/study/leaderboard",
        scriptUrl: "/static/adapters/study/leaderboard/app/index.js",
        stylesheets: [
            "/static/gateways/study/study.css",
            "/static/adapters/study/leaderboard/leaderboard.css",
        ],
        requiredCapabilities: ["study:leaderboard"],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ready = true;
}

export type * from "./types.js";
export { LeaderboardService } from "./service.js";
