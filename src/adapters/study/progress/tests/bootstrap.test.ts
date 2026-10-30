import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { CoreStudyGateway } from "../../../../gateways/study/gateway.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { LearningEventInput } from "../../../../gateways/study/reuse/progress.js";
import type { ProgressCapability } from "../index.js";
import { bootstrapStudyAdapter, createStudyAdapter } from "../index.js";

const flowEvent: LearningEventInput = {
    id: "flow-event",
    occurredAt: "2026-09-11T12:00:00.000Z",
    content: {
        schema: "language-v1",
        layer: "words",
        language: "ja",
        contentId: "word-one",
    },
    contentRevision: "revision-one",
    activity: "recall",
    context: {},
    attempt: 1,
    correct: true,
    independentCorrect: true,
    hints: 0,
    durationMs: 500,
    completion: "completed",
    metadata: {},
};

function bootstrapContext() {
    const systemCtx = createCtx();
    const commands: Array<{ option: string; table: string }> = [];
    const rows: Array<Record<string, unknown> & { table: string }> = [];
    let failProjection = false;
    let failRewards = false;
    const definitions: unknown[] = [];
    const rewards: unknown[] = [];
    const settled = new Set<string>();
    const invalidated: unknown[] = [];
    systemCtx.contributeCapability("system:ctx", systemCtx);
    systemCtx.contributeCapability("engagement:achievements", {
        register: (definition: unknown) => definitions.push(definition),
    });
    systemCtx.contributeCapability(
        "engagement:recordActivity",
        async (activity: { activityId: string }) => {
            rewards.push(activity);
            if (failRewards) throw new Error("reward_storage_unavailable");
            settled.add(activity.activityId);
            return {
                stageResults: {
                    score: [
                        {
                            xp: 10,
                            baseXp: 10,
                            completion: "standard",
                            appliedModifiers: [],
                        },
                    ],
                },
            };
        },
    );
    systemCtx.contributeCapability("engagement:ledger", {
        summary: async () => ({
            xp: settled.size * 10,
            activities: settled.size,
            achievements: [],
        }),
        invalidate: async (...args: string[]) => {
            invalidated.push(args);
            settled.delete(args[2]);
        },
    });
    systemCtx.contributeCapability("db:executor", {
        ensureTable: async () => {},
        executeCommand: async (command: StructuredDbCommand) => {
            commands.push(command);
            if (command.option === "INSERT") {
                for (const value of Object.values(command.values))
                    if (typeof value === "string" && value.includes("\u0000"))
                        throw Object.assign(
                            new Error("invalid_text_encoding"),
                            { code: "22021" },
                        );
            }
            const matches = (row: Record<string, unknown>) =>
                row.table === command.table &&
                (!("where" in command) ||
                    (command.where ?? []).every(
                        (condition) =>
                            row[condition.column] === condition.value,
                    ));
            if (command.option === "SELECT")
                return { rows: rows.filter(matches) };
            if (
                command.table === "study_progress_projections" &&
                failProjection
            )
                throw new Error("projection_storage_unavailable");
            if (command.option === "INSERT") {
                if (
                    command.table === "study_progress_events" &&
                    rows.some((row) => row.event_id === command.values.event_id)
                )
                    return { rowCount: 0 };
                rows.push({ ...command.values, table: command.table });
            }
            if (command.option === "DELETE")
                for (let index = rows.length - 1; index >= 0; index--)
                    if (matches(rows[index])) rows.splice(index, 1);
            return { rowCount: 1 };
        },
        transaction: async (
            callback: (executor: unknown) => Promise<unknown>,
        ) => {
            const before = structuredClone(rows);
            try {
                return await callback(systemCtx.getCapability("db:executor"));
            } catch (error) {
                rows.splice(0, rows.length, ...before);
                throw error;
            }
        },
    });
    const routes: unknown[] = [];
    let enabled = true;
    return {
        systemCtx,
        commands,
        routes,
        definitions,
        rewards,
        invalidated,
        failRewards(value: boolean) {
            failRewards = value;
        },
        failProjection(value: boolean) {
            failProjection = value;
        },
        setEnabled(value: boolean) {
            enabled = value;
        },
        context: {
            gateway: new CoreStudyGateway(),
            adapterId: "progress",
            adapterRoot: "",
            capabilities: {
                require: <Value>(key: string) =>
                    systemCtx.requireCapability<Value>(key),
                get: <Value>(key: string) =>
                    systemCtx.getCapability<Value>(key),
                contribute: (key: string, value: unknown) =>
                    systemCtx.contributeCapability(key, value),
            },
            gatewayRegistry: {} as never,
            flow: systemCtx.flow,
            registerRoute: (route: unknown) => routes.push(route),
            registerStaticDir: () => {},
            registerNavbarPlugin: () => {},
            registerPageExtension: () => {},
            isAdapterEnabled: (id = "progress") => enabled && id === "progress",
        },
    };
}

test("bootstrap contributes the neutral capability, staged flow, and routes", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    assert.ok(fixture.systemCtx.hasCapability("study:progress"));
    assert.ok(fixture.systemCtx.hasFlow("study:progress:recordEvent"));
    assert.equal(fixture.routes.length, 1);
});

test("progress persistence and projection execute inside their flow stages", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    fixture.systemCtx.flow.extend(
        "study:progress:recordEvent",
        "persist",
        { id: "test:observe-persist" },
        () => {
            assert.ok(
                fixture.commands.some(
                    (command) =>
                        command.option === "INSERT" &&
                        command.table === "study_progress_events",
                ),
            );
        },
    );
    fixture.systemCtx.flow.extend(
        "study:progress:recordEvent",
        "project",
        { id: "test:observe-project" },
        () => {
            assert.ok(
                fixture.commands.some(
                    (command) =>
                        command.option === "DELETE" &&
                        command.table === "study_progress_projections",
                ),
            );
        },
    );
    const progress = fixture.systemCtx.requireCapability<{
        recordEvent(actor: unknown, input: unknown): Promise<unknown>;
    }>("study:progress");
    await progress.recordEvent(
        { accountId: "actor-one", role: "user" },
        flowEvent,
    );
});

test("gateway adapter disablement removes progress from active adapters", async () => {
    const gateway = new CoreStudyGateway();
    gateway.registerAdapter(createStudyAdapter());
    assert.equal(gateway.isAdapterEnabled("progress"), true);
    await gateway.disableAdapter("progress");
    assert.equal(gateway.isAdapterEnabled("progress"), false);
});

test("disabled progress adapter gates capabilities and flow hooks", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    fixture.setEnabled(false);
    const progress = fixture.systemCtx.requireCapability<{
        listEvents(actor: unknown): Promise<unknown>;
    }>("study:progress");
    await assert.rejects(
        progress.listEvents({ accountId: "actor-one", role: "user" }),
        /adapter_disabled/,
    );
    await assert.rejects(
        fixture.systemCtx.flow.run(
            "study:progress:recordEvent",
            { id: "disabled-event" },
            { data: {} },
        ),
        /adapter_disabled/,
    );
});

test("retrying an inserted event repairs projections after projection persistence failed", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    const progress =
        fixture.systemCtx.requireCapability<ProgressCapability>(
            "study:progress",
        );
    const actor = { accountId: "actor-one", role: "user" as const };
    fixture.failProjection(true);
    await assert.rejects(
        progress.recordEvent(actor, flowEvent),
        /projection_storage_unavailable/,
    );
    assert.equal((await progress.listEvents(actor)).length, 1);
    fixture.failProjection(false);
    assert.equal(
        (await progress.recordEvent(actor, flowEvent)).duplicate,
        true,
    );
    const projections = await progress.listProjections(actor);
    assert.equal(projections.length, 1);
    assert.equal(projections[0].seen, 1);
});

test("trusted practice runs its staged flow and settles rewards while raw history imports do not", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    const progress =
        fixture.systemCtx.requireCapability<ProgressCapability>(
            "study:progress",
        );
    const actor = { accountId: "actor-one", role: "user" as const };
    await progress.recordEvent(actor, flowEvent);
    assert.equal(fixture.rewards.length, 0);
    const stages: string[] = [];
    for (const stage of ["authorize", "validate", "record", "rewards"])
        fixture.systemCtx.flow.extend(
            "study:progress:recordPractice",
            stage,
            { id: `test:${stage}` },
            () => {
                stages.push(stage);
            },
        );
    await progress.recordPractice(actor, {
        ...flowEvent,
        id: "practice",
        activity: "drawing",
    });
    assert.deepEqual(stages, ["authorize", "validate", "record", "rewards"]);
    assert.equal(fixture.definitions.length, 1);
    assert.equal((await progress.engagement(actor)).xp, 10);
});

test("a reward failure preserves the canonical event and a retry completes reward delivery once", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    const progress =
        fixture.systemCtx.requireCapability<ProgressCapability>(
            "study:progress",
        );
    const actor = { accountId: "actor-one", role: "user" as const };
    const event = { ...flowEvent, activity: "drawing" };
    fixture.failRewards(true);
    await assert.rejects(
        progress.recordPractice(actor, event),
        /reward_storage_unavailable/,
    );
    assert.equal((await progress.listEvents(actor)).length, 1);
    fixture.failRewards(false);
    assert.equal((await progress.recordPractice(actor, event)).duplicate, true);
    await progress.recordPractice(actor, event);
    assert.equal((await progress.engagement(actor)).activities, 1);
});

test("correcting settled practice revokes its reward evidence and cannot be used by another user", async () => {
    const fixture = bootstrapContext();
    await bootstrapStudyAdapter(fixture.context as never);
    const progress =
        fixture.systemCtx.requireCapability<ProgressCapability>(
            "study:progress",
        );
    const actor = { accountId: "actor-one", role: "user" as const };
    await progress.recordPractice(actor, { ...flowEvent, activity: "drawing" });
    const correction = {
        ...flowEvent,
        id: "corrected",
        compensatesEventId: flowEvent.id,
        correct: false,
        independentCorrect: false,
    };
    await assert.rejects(
        progress.correctEvent(
            { accountId: "intruder", role: "user" },
            correction,
        ),
        /forbidden_actor/,
    );
    await progress.correctEvent(actor, correction);
    assert.equal((await progress.engagement(actor)).xp, 0);
    assert.equal(fixture.invalidated.length, 1);
    const deliveries = fixture.rewards.length;
    await progress.recordPractice(actor, { ...flowEvent, activity: "drawing" });
    assert.equal(fixture.rewards.length, deliveries);
});
