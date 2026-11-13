import { publishPractice, invalidatePractice } from "./practice.js";
import { registerPracticeAchievements } from "./achievements.js";
import type {
    AchievementCapability,
    EngagementLedgerCapability,
} from "@cognis/core";
import type { Ctx } from "@cognis/core";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
    StudyClassAccessCapability,
} from "../../../gateways/study/gateway.js";
import { createProgressRoutes } from "./routes/index.js";
import {
    ProgressService,
    rebuildProgressProjections,
    type ProgressRecordFlowData,
} from "./service.js";
import { DbProgressStore } from "./store.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { LearningEvent } from "../../../gateways/study/reuse/progress.js";

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
    adapterReady = false;
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
    const databaseExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    if (!databaseExecutor) {
        await ctx.log?.(
            "error",
            "Study/progress adapter requires the DB gateway.",
            {
                component: "study-progress",
                operation: "bootstrap",
                fatal: true,
            },
        );
        return;
    }
    const achievements = ctx.capabilities.require<AchievementCapability>(
        "engagement:achievements",
    );
    const ledger =
        ctx.capabilities.require<EngagementLedgerCapability>(
            "engagement:ledger",
        );
    ctx.capabilities.require("engagement:recordActivity");
    if (!systemCtx.hasFlow("study:progress:recordPractice"))
        systemCtx.registerFlow({
            id: "study:progress:recordPractice",
            stages: ["authorize", "validate", "record", "rewards"],
        });
    if (!systemCtx.hasFlow("study:progress:recordEvent")) {
        systemCtx.registerFlow({
            id: "study:progress:recordEvent",
            description:
                "Validates, observes, and records an immutable learning event.",
            stages: ["authorize", "validate", "observe", "persist", "project"],
        });
    }
    const store = new DbProgressStore(databaseExecutor);
    try {
        await store.ensureSchema();
    } catch (error) {
        await ctx.log?.(
            "error",
            "Study/progress schema initialization failed.",
            {
                component: "study-progress",
                operation: "ensureSchema",
                error: error instanceof Error ? error.message : String(error),
                fatal: true,
            },
        );
        return;
    }
    ctx.flow.extend(
        "study:progress:recordEvent",
        "persist",
        { id: "study-progress:persist", order: -100 },
        async ({ input, data }) => {
            if (!ctx.isAdapterEnabled()) throw new Error("adapter_disabled");
            const appendResult = await store.append(input as LearningEvent);
            (data as ProgressRecordFlowData).appendResult = appendResult;
            return appendResult;
        },
    );
    ctx.flow.extend(
        "study:progress:recordEvent",
        "project",
        { id: "study-progress:project", order: -100 },
        async ({ input, data }) => {
            if (!ctx.isAdapterEnabled()) throw new Error("adapter_disabled");
            if (!(data as ProgressRecordFlowData).appendResult)
                throw new Error("progress_flow_persistence_missing");
            await rebuildProgressProjections(
                store,
                (input as LearningEvent).actorId,
            );
            return "rebuilt";
        },
    );
    const service = new ProgressService(
        store,
        {
            canRead: (...args) =>
                ctx.capabilities
                    .get<StudyClassAccessCapability>("study:classes:access")
                    ?.canRead(...args) ?? Promise.resolve(false),
            canWrite: (...args) =>
                ctx.capabilities
                    .get<StudyClassAccessCapability>("study:classes:access")
                    ?.canWrite(...args) ?? Promise.resolve(false),
        },
        ctx.flow,
        ctx.log,
        () => ctx.isAdapterEnabled(),
        (actor, event) => publishPractice(ctx, actor, event),
        (event) => invalidatePractice(ctx, event),
        (participantId) => ledger.summary(participantId),
    );
    await registerPracticeAchievements(achievements);
    ctx.registerAdapterStaticDir?.(
        "study",
        "progress",
        `${ctx.adapterRoot}/ui`,
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

export type { ProgressCapability } from "../../../gateways/study/reuse/progress.js";
export type {
    ProgressActor,
    LearningEventInput,
} from "../../../gateways/study/reuse/progress.js";
