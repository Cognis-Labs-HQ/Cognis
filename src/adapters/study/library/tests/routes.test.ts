import assert from "node:assert/strict";
import test from "node:test";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";
import { createLibraryRoutes } from "../routes/index.js";

const schemas = [
    {
        id: "japanese",
        version: 1,
        language: "JA",
        label: "Japanese",
        layers: [],
    },
    { id: "german", version: 1, language: "de", label: "German", layers: [] },
    {
        id: "private-use",
        version: 1,
        language: "X-Test",
        label: "Test Language",
        layers: [],
    },
];

async function request(path: string, token = "learner") {
    const route = createLibraryRoutes(
        { listSchemas: () => schemas } as never,
        createAuthContext(
            new Map([["learner", { sub: "alice", role: "user" }]]),
        ) as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({ method: "GET", token }) as never,
        response as never,
        new URL(`http://localhost${path}`),
    );
    return {
        status: response.statusCode,
        body: JSON.parse(response.payload),
    };
}

test("schema route returns only the requested BCP-47 language", async () => {
    const result = await request("/api/v1/study/library/schemas?language=JA");
    assert.equal(result.status, 200);
    assert.deepEqual(
        result.body.data.map((schema: { id: string }) => schema.id),
        ["japanese"],
    );
});

test("schema route rejects malformed language codes", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=not_a_language",
    );
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "invalid_language");
});

test("schema route supports private-use BCP-47 languages", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=x-test",
    );
    assert.equal(result.status, 200);
    assert.deepEqual(
        result.body.data.map((schema: { id: string }) => schema.id),
        ["private-use"],
    );
});

test("schema route rejects unauthorized requests", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=ja",
        "",
    );
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, "unauthorized");
});
