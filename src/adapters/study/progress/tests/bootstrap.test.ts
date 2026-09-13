import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { CoreStudyGateway } from "../../../../gateways/study/gateway.js";
import { bootstrapStudyAdapter, createStudyAdapter } from "../index.js";

function bootstrapContext() {
    const systemCtx = createCtx();
    const commands: Array<{ option: string; table: string }> = [];
    systemCtx.contributeCapability("system:ctx", systemCtx);
    systemCtx.contributeCapability("db:executor", {
        ensureTable: async () => {},
        executeCommand: async (command: { option: string; table: string }) => {
            commands.push(command);
            return { rows: [], rowCount: 1 };
        },
        transaction: async (
            callback: (executor: unknown) => Promise<unknown>,
        ) => callback(systemCtx.getCapability("db:executor")),
    });
    const routes: unknown[] = [];
    return {
        systemCtx,
        commands,
        routes,
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
            isAdapterEnabled: () => true,
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
        {
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
        },
    );
});

test("gateway adapter disablement removes progress from active adapters", async () => {
    const gateway = new CoreStudyGateway();
    gateway.registerAdapter(createStudyAdapter());
    assert.equal(gateway.isAdapterEnabled("progress"), true);
    await gateway.disableAdapter("progress");
    assert.equal(gateway.isAdapterEnabled("progress"), false);
});
