import type { Ctx, ScoringCapability } from "@cognis/core";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
    StudyClassAccessCapability,
} from "../../../gateways/study/gateway.js";
import { LeaderboardService } from "./service.js";
import type {
    LeaderboardCapability,
    LeaderboardActor,
    LeaderboardObservation,
    ProgressEvidenceCapability,
    StandingsQuery,
} from "./types.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { createLeaderboardRoutes } from "./routes/index.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import { DbLeaderboardStore } from "./store.js";

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
    const scoring =
        ctx.capabilities.get<ScoringCapability>("engagement:scoring");
    if (!systemCtx || !scoring) {
        await ctx.log?.(
            "error",
            "Study/leaderboard requires the system context and engagement scoring capability.",
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
    const databaseExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    const store = databaseExecutor
        ? new DbLeaderboardStore(databaseExecutor)
        : undefined;
    if (store) await store.ensureSchema();
    const service = new LeaderboardService(
        () =>
            ctx.capabilities.get<ProgressEvidenceCapability>("study:progress"),
        () => ctx.isAdapterEnabled(),
        scoring,
        ctx.capabilities.get<StudyClassAccessCapability>(
            "study:classes:access",
        ),
        ctx.log,
        store ? (state) => store.save(state) : undefined,
    );
    const storedState = await store?.load();
    if (storedState) service.restoreState(storedState);
    systemCtx.flow.extend(
        "study:leaderboard:submitObservation",
        "persist",
        { id: "study-leaderboard:persist", order: -100 },
        async ({ input }) => {
            const { actor, observation } = input as {
                actor: LeaderboardActor;
                observation: LeaderboardObservation;
            };
            return service.submitObservation(actor, observation);
        },
    );
    systemCtx.flow.extend(
        "study:leaderboard:queryStandings",
        "rank",
        { id: "study-leaderboard:rank", order: -100 },
        ({ input }) => service.queryStandings(input as StandingsQuery),
    );
    systemCtx.flow.extend(
        "study:leaderboard:rollover",
        "archive",
        { id: "study-leaderboard:archive", order: -100 },
        ({ input }) => {
            const rollover = input as {
                definitionId: string;
                nextSeason: { id: string; startsAt: string; endsAt: string };
            };
            return service.rollover(rollover.definitionId, rollover.nextSeason);
        },
    );
    const capability = new Proxy(service, {
        get(target, property, receiver) {
            if (property === "submitObservation")
                return async (
                    actor: LeaderboardActor,
                    observation: LeaderboardObservation,
                ) => {
                    await systemCtx.flow.run(
                        "study:leaderboard:submitObservation",
                        {
                            actor,
                            observation,
                        },
                    );
                };
            if (property === "queryStandings")
                return async (query: StandingsQuery) => {
                    const result = await systemCtx.flow.run(
                        "study:leaderboard:queryStandings",
                        query,
                    );
                    return result.stageResults.rank?.[0];
                };
            if (property === "requestTableModel")
                return async (query: StandingsQuery, locale: string) => {
                    const result = await systemCtx.flow.run(
                        "study:leaderboard:queryStandings",
                        query,
                    );
                    return service.requestTableModel(
                        query,
                        locale,
                        result.stageResults.rank?.[0] as {
                            rows: import("./types.js").StandingRow[];
                            total: number;
                        },
                    );
                };
            if (property === "rollover")
                return (
                    definitionId: string,
                    nextSeason: {
                        id: string;
                        startsAt: string;
                        endsAt: string;
                    },
                ) => {
                    void systemCtx.flow.run("study:leaderboard:rollover", {
                        definitionId,
                        nextSeason,
                    });
                };
            const value = Reflect.get(target, property, receiver);
            return typeof value === "function" ? value.bind(target) : value;
        },
    }) as LeaderboardCapability;
    ctx.capabilities.contribute("study:leaderboard", capability);
    systemCtx.contributePublicCapability("study:leaderboard", capability);
    ctx.registerRoute(
        createLeaderboardRoutes(
            capability,
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
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/leaderboard/leaderboard.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ready = true;
}

export type * from "./types.js";
export { LeaderboardService } from "./service.js";
