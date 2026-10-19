import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { CoreStudyGateway } from "../../../../gateways/study/gateway.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { LearningEventInput } from "../types.js";
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
    systemCtx.contributeCapability("system:ctx", systemCtx);
    systemCtx.contributeCapability("db:executor", {
        ensureTable: async () => {},
        executeCommand: async (command: StructuredDbCommand) => {
            commands.push(command);
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
            isAdapterEnabled: () => enabled,
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
