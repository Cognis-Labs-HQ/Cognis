import assert from "node:assert/strict";
import test from "node:test";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";
import { createProgressRoutes } from "../routes/index.js";

const routeContext = createAuthContext(
    new Map([
        ["learner", { sub: "actor-one", role: "user" }],
        ["admin", { sub: "admin-one", role: "admin" }],
    ]),
);

async function dispatch(
    progress: Record<string, unknown>,
    method: string,
    path: string,
    body?: Record<string, unknown>,
    token = "learner",
): Promise<{ status: number; body: Record<string, unknown> }> {
    const route = createProgressRoutes(
        progress as never,
        routeContext as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({
            method,
            token,
            body: body ? JSON.stringify(body) : undefined,
        }) as never,
        response as never,
        new URL(`http://localhost${path}`),
    );
    return {
        status: response.statusCode,
        body: JSON.parse(response.payload) as Record<string, unknown>,
    };
}

test("correction route delegates immutable compensation records", async () => {
    let received: Record<string, unknown> | undefined;
    const result = await dispatch(
        {
            correctEvent: async (
                _actor: unknown,
                input: Record<string, unknown>,
            ) => {
                received = input;
                return { event: input, duplicate: false };
            },
        },
        "POST",
        "/api/v1/study/progress/events/corrections",
        { id: "correction-one", compensatesEventId: "event-one" },
    );
    assert.equal(result.status, 201);
    assert.equal(received?.compensatesEventId, "event-one");
});

test("granular routes delegate events, projections, aggregation, and rebuilds", async () => {
    const calls: Array<{ operation: string; value: unknown }> = [];
    const progress = {
        listEvents: async (_actor: unknown, filters: unknown) => {
            calls.push({ operation: "events", value: filters });
            return [];
        },
        listProjections: async (_actor: unknown, filters: unknown) => {
            calls.push({ operation: "projections", value: filters });
            return [];
        },
        aggregate: async (_actor: unknown, filters: unknown) => {
            calls.push({ operation: "aggregate", value: filters });
            return { events: 0 };
        },
        rebuild: async (_actor: unknown, actorId: string) => {
            calls.push({ operation: "rebuild", value: actorId });
            return [];
        },
    };
    const query =
        "actorId=actor-one&schema=language-v1&layer=words&language=ja" +
        "&activity=recall&interestVein=travel&classroomId=class-one" +
        "&eventId=event-one&from=2026-09-01&until=2026-09-30";

    assert.equal(
        (
            await dispatch(
                progress,
                "GET",
                `/api/v1/study/progress/events?${query}`,
            )
        ).status,
        200,
    );
    assert.equal(
        (
            await dispatch(
                progress,
                "GET",
                `/api/v1/study/progress/projections?${query}`,
            )
        ).status,
        200,
    );
    assert.equal(
        (
            await dispatch(
                progress,
                "GET",
                `/api/v1/study/progress/aggregate?${query}`,
            )
        ).status,
        200,
    );
    assert.equal(
        (
            await dispatch(
                progress,
                "POST",
                "/api/v1/study/progress/rebuild?actorId=actor-one",
                undefined,
                "admin",
            )
        ).status,
        200,
    );

    assert.deepEqual(
        calls.slice(0, 3).map(({ value }) => value),
        [
            {
                actorId: "actor-one",
                schema: "language-v1",
                layer: "words",
                language: "ja",
                activity: "recall",
                interestVein: "travel",
                classroomId: "class-one",
                eventId: "event-one",
                from: "2026-09-01",
                until: "2026-09-30",
            },
            calls[0].value,
            calls[0].value,
        ],
    );
    assert.deepEqual(calls[3], { operation: "rebuild", value: "actor-one" });
});

test("event recording reports inserted and idempotent outcomes", async () => {
    let duplicate = false;
    const progress = {
        recordEvent: async (_actor: unknown, input: unknown) => ({
            event: input,
            duplicate,
        }),
    };
    const input = { id: "event-one" };
    assert.equal(
        (
            await dispatch(
                progress,
                "POST",
                "/api/v1/study/progress/events",
                input,
            )
        ).status,
        201,
    );
    duplicate = true;
    assert.equal(
        (
            await dispatch(
                progress,
                "POST",
                "/api/v1/study/progress/events",
                input,
            )
        ).status,
        200,
    );
});

test("progress routes conceal unexpected persistence failures", async () => {
    const result = await dispatch(
        {
            listEvents: async () => {
                throw new Error("database_connection_secret");
            },
        },
        "GET",
        "/api/v1/study/progress/events",
    );
    assert.equal(result.status, 500);
    assert.equal(
        (result.body.error as { code: string }).code,
        "internal_error",
    );
});
