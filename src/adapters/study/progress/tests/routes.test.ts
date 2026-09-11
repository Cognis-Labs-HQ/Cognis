import assert from "node:assert/strict";
import test from "node:test";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";
import { createProgressRoutes } from "../routes/index.js";

const routeContext = createAuthContext(
    new Map([["learner", { sub: "actor-one", role: "user" }]]),
);

async function dispatch(
    progress: Record<string, unknown>,
    method: string,
    path: string,
    body?: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
    const route = createProgressRoutes(
        progress as never,
        routeContext as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({
            method,
            token: "learner",
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
