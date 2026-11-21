import test from "node:test";
import assert from "node:assert/strict";
import { createCtx, type FlowStageContext } from "../ctx/index.js";

const envelopeKeys = [
    "ctx",
    "flowId",
    "stageId",
    "input",
    "meta",
    "data",
    "stageResults",
] as const;

function assertImmutableEnvelope(context: FlowStageContext): void {
    const alias = context as unknown as Record<string, unknown>;
    for (const key of envelopeKeys) {
        const original = context[key];
        const replacement = Symbol(key);
        assert.throws(
            () => {
                alias[key] = replacement;
            },
            TypeError,
            key,
        );
        assert.equal(Reflect.set(alias, key, replacement), false, key);
        assert.throws(
            () => Object.assign(alias, { [key]: replacement }),
            TypeError,
            key,
        );
        assert.throws(
            () => Object.defineProperty(alias, key, { value: replacement }),
            TypeError,
            key,
        );
        assert.equal(
            Reflect.defineProperty(alias, key, { value: replacement }),
            false,
            key,
        );
        assert.throws(
            () => {
                delete alias[key];
            },
            TypeError,
            key,
        );
        assert.equal(Reflect.deleteProperty(alias, key), false, key);
        assert.strictEqual(context[key], original, key);
        assert.deepEqual(Object.getOwnPropertyDescriptor(context, key), {
            value: original,
            enumerable: true,
            configurable: false,
            writable: false,
        });
    }
    assert.equal(Object.isFrozen(context), true);
    assert.equal(Reflect.set(alias, "extra", true), false);
    assert.equal(Reflect.setPrototypeOf(alias, null), false);
}

test("flow envelopes resist writes through owners, extensions and retained aliases", async () => {
    const ctx = createCtx();
    const input = { value: "current" };
    let retained: FlowStageContext | undefined;
    ctx.registerFlow({ id: "operation", stages: ["process"] });
    ctx.addFlowStageHook(
        "operation",
        "process",
        { id: "observer" },
        (context) => {
            assert.strictEqual(context, retained);
            assertImmutableEnvelope(context);
            return context.input;
        },
    );

    const result = await ctx.runFlow("operation", input, {
        handlers: {
            process: (context) => {
                retained = context;
                assert.strictEqual(context.ctx, ctx);
                assert.strictEqual(context.input, input);
                assertImmutableEnvelope(context);
                return context.input;
            },
        },
    });

    assert.ok(retained);
    assertImmutableEnvelope(retained);
    assert.strictEqual(retained.stageResults, result.stageResults);
    assert.deepEqual(result.stageResults.process, [input, input]);
});

test("an earlier hook cannot replace both input and results with a completed run pair", async () => {
    const ctx = createCtx();
    const inputs = [{ value: "first" }, { value: "second" }];
    const observed: FlowStageContext[] = [];
    let previous: FlowStageContext | undefined;
    ctx.registerFlow({ id: "operation", stages: ["prepare", "finish"] });
    ctx.addFlowStageHook(
        "operation",
        "finish",
        { id: "replace", order: -1 },
        (context) => {
            const previousContext = previous;
            if (previousContext) {
                const alias = context;
                assert.equal(
                    Reflect.set(alias, "input", previousContext.input),
                    false,
                );
                assert.equal(
                    Reflect.set(
                        alias,
                        "stageResults",
                        previousContext.stageResults,
                    ),
                    false,
                );
                assert.throws(
                    () =>
                        Object.assign(alias, {
                            input: previousContext.input,
                            stageResults: previousContext.stageResults,
                        }),
                    TypeError,
                );
            }
            return "attempted";
        },
    );
    ctx.addFlowStageHook(
        "operation",
        "finish",
        { id: "observe" },
        (context) => {
            assert.strictEqual(context.input, inputs[observed.length]);
            assert.strictEqual(context.stageResults.prepare[0], context.input);
            if (previous) {
                assert.notStrictEqual(context, previous);
                assert.notStrictEqual(
                    context.stageResults,
                    previous.stageResults,
                );
                assert.strictEqual(previous.input, inputs[0]);
            }
            observed.push(context);
            previous = context;
            return context.input;
        },
    );

    for (const input of inputs) {
        const result = await ctx.runFlow("operation", input, {
            handlers: {
                prepare: (context) => context.input,
                finish: (context) => {
                    assert.strictEqual(context.input, input);
                    assert.strictEqual(context.stageResults.prepare[0], input);
                    return "owner";
                },
            },
        });
        assert.strictEqual(observed.at(-1)?.stageResults, result.stageResults);
        assert.deepEqual(result.stageResults.finish, [
            "owner",
            "attempted",
            input,
        ]);
    }
    assert.equal(observed.length, 2);
    assert.strictEqual(observed[0].stageResults.prepare[0], inputs[0]);
});

test("frozen envelopes preserve mutable payloads and deterministic accumulated results", async () => {
    const ctx = createCtx();
    const input = { steps: [] as string[] };
    const data = { steps: [] as string[] };
    const meta = { nested: { steps: [] as string[] } };
    const ownerOutput = { count: 0 };
    const contexts: FlowStageContext[] = [];
    ctx.registerFlow({ id: "operation", stages: ["prepare", "finish"] });
    for (const hook of [
        { id: "last", order: 1 },
        { id: "zeta" },
        { id: "alpha" },
    ]) {
        ctx.addFlowStageHook("operation", "prepare", hook, (context) => {
            assert.strictEqual(context, contexts[0]);
            assert.deepEqual(context.stageResults, {});
            (context.input as typeof input).steps.push(hook.id);
            (context.data.steps as string[]).push(hook.id);
            return hook.id;
        });
    }

    const result = await ctx.flow.run("operation", input, {
        data,
        meta,
        handlers: {
            prepare: (context) => {
                contexts.push(context);
                assert.equal(Object.isFrozen(context), true);
                assert.strictEqual(context.input, input);
                assert.strictEqual(context.data, data);
                assert.notStrictEqual(context.meta, meta);
                assert.equal(Object.isFrozen(context.meta), true);
                assert.strictEqual(context.meta.nested, meta.nested);
                assert.equal(Reflect.set(context.meta, "extra", true), false);
                (context.meta.nested as typeof meta.nested).steps.push("owner");
                input.steps.push("owner");
                data.steps.push("owner");
                return ownerOutput;
            },
            finish: (context) => {
                contexts.push(context);
                assert.equal(Object.isFrozen(context), true);
                assert.notStrictEqual(context, contexts[0]);
                assert.strictEqual(context.meta, contexts[0].meta);
                assert.strictEqual(
                    context.stageResults,
                    contexts[0].stageResults,
                );
                assert.deepEqual(context.stageResults.prepare, [
                    ownerOutput,
                    "alpha",
                    "zeta",
                    "last",
                ]);
                assert.strictEqual(
                    context.stageResults.prepare[0],
                    ownerOutput,
                );
                (context.stageResults.prepare[0] as typeof ownerOutput).count +=
                    1;
                context.stageResults.prepare.push("appended");
                context.stageResults.notes = ["mutable"];
                return "finished";
            },
        },
    });

    assert.strictEqual(result.data, data);
    assert.strictEqual(result.stageResults, contexts[0].stageResults);
    assert.deepEqual(data.steps, ["owner", "alpha", "zeta", "last"]);
    assert.deepEqual(input.steps, data.steps);
    assert.deepEqual(meta.nested.steps, ["owner"]);
    assert.equal(ownerOutput.count, 1);
    assert.deepEqual(result.stageResults, {
        prepare: [ownerOutput, "alpha", "zeta", "last", "appended"],
        notes: ["mutable"],
        finish: ["finished"],
    });
});

test("nested runs keep distinct envelopes while intentionally sharing mutable data", async () => {
    const ctx = createCtx();
    const input = { steps: [] as string[] };
    const data = { steps: [] as string[] };
    const contexts: FlowStageContext[] = [];
    ctx.registerFlow({ id: "outer", stages: ["compose"] });
    ctx.registerFlow({ id: "inner", stages: ["process"] });
    ctx.addFlowStageHook("inner", "process", { id: "extend" }, (context) => {
        contexts.push(context);
        assertImmutableEnvelope(context);
        assert.strictEqual(context.input, input);
        assert.strictEqual(context.data, data);
        (context.input as typeof input).steps.push("inner");
        (context.data.steps as string[]).push("inner");
        return "inner";
    });

    const result = await ctx.runFlow("outer", input, {
        data,
        handlers: {
            compose: async (context) => {
                contexts.push(context);
                const nested = await context.ctx.runFlow(
                    "inner",
                    context.input,
                    {
                        data: context.data,
                        meta: context.meta,
                    },
                );
                assertImmutableEnvelope(context);
                assert.equal(context.flowId, "outer");
                assert.equal(context.stageId, "compose");
                assert.deepEqual(context.stageResults, {});
                assert.notStrictEqual(
                    nested.stageResults,
                    context.stageResults,
                );
                assert.strictEqual(
                    nested.stageResults,
                    contexts[1].stageResults,
                );
                return nested.stageResults.process[0];
            },
        },
    });

    assert.notStrictEqual(contexts[0], contexts[1]);
    assert.deepEqual(result.stageResults, { compose: ["inner"] });
    assert.deepEqual(contexts[1].stageResults, { process: ["inner"] });
    assert.deepEqual(input.steps, ["inner"]);
    assert.deepEqual(data.steps, ["inner"]);
});

test(
    "overlapping runs isolate retained envelopes and per-run owner handlers",
    { timeout: 5000 },
    async () => {
        const ctx = createCtx();
        const contexts: FlowStageContext[] = [];
        let release!: () => void;
        const bothEntered = new Promise<void>((resolve) => {
            release = resolve;
        });
        ctx.registerFlow({ id: "operation", stages: ["prepare", "finish"] });
        ctx.addFlowStageHook(
            "operation",
            "prepare",
            { id: "overlap" },
            async (context) => {
                contexts.push(context);
                if (contexts.length === 2) release();
                await bothEntered;
                assertImmutableEnvelope(context);
                assert.strictEqual(context.data.owner, context.input);
                return context.input;
            },
        );

        const inputs = [{ value: "first" }, { value: "second" }];
        const results = await Promise.all(
            inputs.map((input) =>
                ctx.runFlow("operation", input, {
                    handlers: {
                        prepare: async (context) => {
                            assert.strictEqual(context.input, input);
                            context.data.owner = input;
                            await Promise.resolve();
                            return input;
                        },
                        finish: (context) => {
                            assertImmutableEnvelope(context);
                            assert.strictEqual(context.input, input);
                            assert.strictEqual(context.data.owner, input);
                            assert.deepEqual(context.stageResults.prepare, [
                                input,
                                input,
                            ]);
                            return input;
                        },
                    },
                }),
            ),
        );

        assert.equal(contexts.length, 2);
        assert.notStrictEqual(contexts[0], contexts[1]);
        assert.notStrictEqual(contexts[0].data, contexts[1].data);
        assert.notStrictEqual(contexts[0].meta, contexts[1].meta);
        assert.notStrictEqual(
            contexts[0].stageResults,
            contexts[1].stageResults,
        );
        for (const [index, result] of results.entries()) {
            const context = contexts.find(
                (entry) => entry.input === inputs[index],
            );
            assert.ok(context);
            assertImmutableEnvelope(context);
            assert.strictEqual(context.stageResults, result.stageResults);
            assert.deepEqual(result.stageResults, {
                prepare: [inputs[index], inputs[index]],
                finish: [inputs[index]],
            });
        }
    },
);
