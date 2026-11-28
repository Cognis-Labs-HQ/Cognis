import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createCtx } from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import {
    DRAWING_PROGRESS_FLOWS,
    DrawingProgressStore,
} from "../../drawing/progress.js";
import { createDrawingRoutes } from "../../drawing/routes/index.js";

function fixture() {
    const values = new Map<string, string>();
    let rejectWrite = false;
    const preferences = {
        get: async (accountId: string, key: string) =>
            values.get(JSON.stringify([accountId, key])) ?? null,
        set: async (accountId: string, key: string, value: string) => {
            if (rejectWrite) throw new Error("storage_unavailable");
            values.set(JSON.stringify([accountId, key]), value);
        },
        clearUser: async () => {},
    };
    const ctx = createCtx();
    for (const flow of DRAWING_PROGRESS_FLOWS) ctx.registerFlow(flow);
    const service = new DrawingProgressStore(preferences);
    const logs: unknown[][] = [];
    const recorded: unknown[] = [];
    const route = createDrawingRoutes(
        service,
        {
            requireAuth: (req: IncomingMessage, res: ServerResponse) => {
                const account = req.headers["test-account"];
                if (typeof account === "string")
                    return { sub: account, role: "user" };
                res.writeHead(401);
                res.end();
                return null;
            },
        } as RouteContext,
        ctx.flow,
        (...args) => logs.push(args),
        async (actor, cardId, input) => {
            recorded.push({ actor, cardId, input });
        },
    );
    return {
        ctx,
        service,
        preferences,
        values,
        logs,
        recorded,
        rejectWrites: (reject: boolean) => {
            rejectWrite = reject;
        },
        async request(
            accountId: string | undefined,
            method = "GET",
            body?: unknown,
            cardId = "card-a",
        ) {
            const req = Readable.from(
                body === undefined ? [] : [JSON.stringify(body)],
            ) as IncomingMessage;
            req.method = method;
            req.headers = accountId ? { "test-account": accountId } : {};
            let status = 0;
            let payload = "";
            const res = {
                writeHead: (value: number) => {
                    status = value;
                },
                end: (value?: string) => {
                    payload = value ?? "";
                },
            } as ServerResponse;
            assert.equal(
                await route(
                    req,
                    res,
                    new URL(`http://localhost/api/v1/study/drawing/${cardId}`),
                ),
                true,
            );
            return {
                status,
                payload: payload ? JSON.parse(payload) : undefined,
            };
        },
    };
}

test("drawing progress persists the hiding count per user/card across service restarts", async () => {
    const state = fixture();
    const first = { strokeCount: 4, mistakes: 0 };
    assert.deepEqual((await state.request("learner")).payload.data, {
        completed: false,
        hiddenStrokeCount: 0,
    });
    assert.equal(
        (await state.request("learner", "POST", first)).payload.data
            .hiddenStrokeCount,
        1,
    );
    assert.equal(
        (await state.request("learner", "POST", { ...first, mistakes: 2 }))
            .payload.data.hiddenStrokeCount,
        1,
    );
    const restarted = new DrawingProgressStore(state.preferences);
    assert.deepEqual(await restarted.get("learner", "card-a"), {
        completed: true,
        hiddenStrokeCount: 1,
    });
    assert.deepEqual(await restarted.get("other", "card-a"), {
        completed: false,
        hiddenStrokeCount: 0,
    });
    assert.deepEqual(await restarted.get("learner", "card-b"), {
        completed: false,
        hiddenStrokeCount: 0,
    });
    assert.deepEqual(JSON.parse([...state.values.values()][0]), {
        completed: true,
        hiddenStrokeCount: 1,
    });
    assert.ok(state.logs.some((log) => log[0] === "info"));
});

test("concurrent completions retain count increments, cap to the current pattern, and recover after storage failures", async () => {
    const state = fixture();
    await Promise.all(
        Array.from({ length: 3 }, () =>
            state.service.complete("learner", "card-a", {
                strokeCount: 4,
                mistakes: 0,
            }),
        ),
    );
    assert.equal(
        (await state.service.get("learner", "card-a")).hiddenStrokeCount,
        3,
    );
    await state.service.complete("learner", "card-a", {
        strokeCount: 2,
        mistakes: 0,
    });
    assert.equal(
        (await state.service.get("learner", "card-a")).hiddenStrokeCount,
        2,
    );
    state.rejectWrites(true);
    assert.equal(
        (
            await state.request("learner", "POST", {
                strokeCount: 4,
                mistakes: 0,
            })
        ).status,
        500,
    );
    state.rejectWrites(false);
    assert.equal(
        (
            await state.request("learner", "POST", {
                strokeCount: 4,
                mistakes: 0,
            })
        ).payload.data.hiddenStrokeCount,
        3,
    );
});

test("drawing routes authenticate, reject share identities and invalid writes, and execute registered flow hooks before persistence", async () => {
    const state = fixture();
    assert.equal((await state.request(undefined)).status, 401);
    assert.equal((await state.request("share:guest")).status, 403);
    for (const input of [
        {},
        { strokeCount: -1, mistakes: 0 },
        { strokeCount: 2, mistakes: 0.5 },
        { strokeCount: 10001, mistakes: 0 },
    ]) {
        assert.equal(
            (await state.request("learner", "POST", input)).status,
            400,
        );
    }
    assert.equal(
        (await state.request("learner", "GET", undefined, "%zz")).status,
        400,
    );
    const order: string[] = [];
    state.ctx.flow.extend(
        "study:drawing:complete",
        "authorize",
        { id: "test:authorize" },
        () => order.push("authorize"),
    );
    state.ctx.flow.extend(
        "study:drawing:complete",
        "validate",
        { id: "test:reject" },
        () => {
            order.push("validate");
            throw new Error("forbidden");
        },
    );
    assert.equal(
        (
            await state.request("learner", "POST", {
                strokeCount: 4,
                mistakes: 0,
            })
        ).status,
        403,
    );
    assert.deepEqual(order, ["authorize", "validate"]);
    assert.equal(state.values.size, 0);
    assert.ok(state.logs.some((log) => log[0] === "error"));
});

test("drawing results reach the progress integration only after validation and preserve assistance and failure", async () => {
    const state = fixture();
    for (const result of ["correct", "incorrect"] as const) {
        const input = {
            strokeCount: 4,
            mistakes: result === "incorrect" ? 10 : 1,
            result,
            assisted: true,
        };
        assert.equal(
            (await state.request("learner", "POST", input)).status,
            200,
        );
        assert.deepEqual(state.recorded.at(-1), {
            actor: { accountId: "learner", role: "user" },
            cardId: "card-a",
            input,
        });
    }
    assert.equal(
        (await state.request("learner")).payload.data.hiddenStrokeCount,
        0,
    );
    await state.request("learner", "POST", { strokeCount: 0, mistakes: 0 });
    assert.equal(state.recorded.length, 2);
});

test("re-delivering a drawing completion does not increase guide difficulty twice", async () => {
    const state = fixture();
    const input = {
        strokeCount: 4,
        mistakes: 0,
        attempt: {
            id: "drawing-attempt",
            occurredAt: "2026-10-19T00:00:00.000Z",
        },
    };
    const first = await state.service.complete("learner", "card-a", input);
    assert.equal(first.hiddenStrokeCount, 1);
    assert.deepEqual(
        await state.service.complete("learner", "card-a", input),
        first,
    );
    assert.equal(
        (
            await state.service.complete("learner", "card-a", {
                ...input,
                attempt: { ...input.attempt, id: "next-attempt" },
            })
        ).hiddenStrokeCount,
        2,
    );
    const restarted = new DrawingProgressStore(state.preferences);
    assert.equal(
        (await restarted.complete("learner", "card-a", input))
            .hiddenStrokeCount,
        2,
    );
    await restarted.complete("learner", "card-a", {
        strokeCount: 4,
        mistakes: 3,
    });
    assert.equal(
        (await restarted.complete("learner", "card-a", input))
            .hiddenStrokeCount,
        2,
    );
});

test("drawing rejects oversized JSON before recording progress or rewards", async () => {
    const state = fixture();
    const response = await state.request("learner", "POST", {
        strokeCount: 4,
        mistakes: 0,
        extra: "a".repeat(16 * 1024),
    });
    assert.equal(response.status, 413);
    assert.equal(response.payload.error, "request_body_too_large");
    assert.equal(state.recorded.length, 0);
    assert.equal(state.values.size, 0);
});
