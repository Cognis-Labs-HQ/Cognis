import assert from "node:assert/strict";
import test from "node:test";
import { VolatileUserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import { DictionarySearchState } from "../service/search-context.js";

const query = {
    language: "ja",
    providerId: "jisho",
    schemaId: "japanese-core",
    query: "年",
};
test("dictionary search state survives remounts without leaking across authenticated accounts", async () => {
    const preferences = new VolatileUserPreferenceStore();
    const state = new DictionarySearchState(preferences);
    await state.set("alice", { ...query, extra: "discard" });
    assert.deepEqual(
        await new DictionarySearchState(preferences).get("alice"),
        query,
    );
    assert.equal(await state.get("bob"), null);
    await state.set("alice", { ...query, query: "室" });
    assert.equal((await state.get("alice"))?.query, "室");
    await preferences.clearUser("alice");
    assert.equal(await state.get("alice"), null);
});
test("invalid searches cannot replace the saved search context", async () => {
    const state = new DictionarySearchState(new VolatileUserPreferenceStore());
    await state.set("alice", query);
    for (const input of [
        null,
        [],
        { ...query, query: " " },
        { ...query, query: "a".repeat(101) },
        { ...query, providerId: 1 },
    ])
        await assert.rejects(state.set("alice", input), /invalid_query/);
    assert.deepEqual(await state.get("alice"), query);
});

async function routeFixture() {
    const { createCtx } = await import("@cognis/core");
    const { createDictionarySearchContextRoutes } =
        await import("../routes/search-context.js");
    const { createAuthContext, RequestRecorder, ResponseRecorder } =
        await import("../../../../api/tests/reuse/route-test-helpers.js");
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:library:searchContext",
        stages: ["authorize", "validate", "persist"],
    });
    ctx.registerFlow({
        id: "study:library:readSearchContext",
        stages: ["authorize", "resolve"],
    });
    const state = new DictionarySearchState(new VolatileUserPreferenceStore());
    const failures: Record<string, unknown>[] = [];
    const auth = createAuthContext(
        new Map([
            ["alice", { sub: "alice", role: "user" }],
            ["bob", { sub: "bob", role: "user" }],
            ["guest", { sub: "share:guest", role: "user" }],
        ]),
    );
    const route = createDictionarySearchContextRoutes(
        state,
        auth as never,
        ctx.flow,
        async (_level, _message, metadata) => {
            failures.push(metadata ?? {});
        },
    );
    const request = async (
        token: string,
        method = "GET",
        body = JSON.stringify(query),
    ) => {
        const response = Object.assign(new ResponseRecorder(), {
            setHeader(name: string, value: string) {
                this.headers[name.toLowerCase()] = value;
            },
        });
        await route(
            new RequestRecorder({
                token,
                method,
                body,
            }) as never,
            response as never,
            new URL("http://localhost/api/v1/study/library/dictionary/context"),
        );
        return response;
    };
    return { ctx, state, request, failures };
}

test("search context routes authenticate, isolate accounts and reject shared-link reads and writes", async () => {
    const { request } = await routeFixture();
    assert.equal((await request("missing")).statusCode, 401);
    assert.equal((await request("alice", "PUT")).statusCode, 200);
    const own = await request("alice");
    assert.deepEqual(JSON.parse(own.payload).data, query);
    assert.equal(own.headers["cache-control"], "no-store");
    assert.equal(JSON.parse((await request("bob")).payload).data, null);
    assert.equal((await request("guest", "PUT")).statusCode, 403);
    assert.equal((await request("guest")).statusCode, 403);
});

test("search context bounds streamed writes and reports invalid JSON without replacing saved state", async () => {
    const { request, state } = await routeFixture();
    await request("alice", "PUT");
    const oversized = await request(
        "alice",
        "PUT",
        JSON.stringify({ ...query, extra: "a".repeat(16 * 1024) }),
    );
    assert.equal(oversized.statusCode, 413);
    assert.equal(
        JSON.parse(oversized.payload).error.code,
        "request_body_too_large",
    );
    assert.equal((await request("alice", "PUT", "{")).statusCode, 400);
    assert.equal(
        (await request("alice", "PUT", JSON.stringify({ ...query, query: "" })))
            .statusCode,
        400,
    );
    assert.deepEqual(await state.get("alice"), query);
});

test("search context flows permit adjustments before persistence and veto reads before storage", async () => {
    const { ctx, request, state, failures } = await routeFixture();
    ctx.flow.extend(
        "study:library:searchContext",
        "validate",
        { id: "test:adjust" },
        ({ data }) => {
            data.input = { ...query, query: "室" };
        },
    );
    assert.equal((await request("alice", "PUT")).statusCode, 200);
    assert.equal((await state.get("alice"))?.query, "室");
    const reads: string[] = [];
    const originalRead = state.get.bind(state);
    state.get = async (accountId) => {
        reads.push(accountId);
        return originalRead(accountId);
    };
    ctx.flow.extend(
        "study:library:readSearchContext",
        "authorize",
        { id: "test:veto" },
        () => {
            throw new Error("private extension failure");
        },
    );
    const response = await request("alice");
    assert.equal(response.statusCode, 500);
    assert.equal(
        JSON.parse(response.payload).error.code,
        "search_context_failed",
    );
    assert.deepEqual(reads, []);
    assert.ok(failures.length);
    assert.ok(!JSON.stringify(failures).includes("private extension failure"));
});
