import type { Ctx } from "@cognis/core";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { LeaderboardService } from "./service.js";
import type { ProgressEvidenceCapability } from "./types.js";

let ready = false;
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
    if (!systemCtx || !progress) {
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
    ctx.capabilities.contribute(
        "study:leaderboard",
        new LeaderboardService(progress, () => ctx.isAdapterEnabled()),
    );
    ready = true;
}

export type * from "./types.js";
export { LeaderboardService } from "./service.js";
