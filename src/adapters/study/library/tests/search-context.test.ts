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

test("search context routes require authentication, isolate accounts and disallow shared-link writes", async () => {
    const { createCtx } = await import("@cognis/core");
    const { createDictionarySearchContextRoutes } =
        await import("../routes/search-context.js");
    const { createAuthContext, RequestRecorder, ResponseRecorder } =
        await import("../../../../api/tests/reuse/route-test-helpers.js");
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:library:searchContext",
        stages: ["authorize", "persist"],
    });
    const state = new DictionarySearchState(new VolatileUserPreferenceStore());
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
    );
    const request = async (token: string, method = "GET") => {
        const response = Object.assign(new ResponseRecorder(), {
            setHeader(name: string, value: string) {
                this.headers[name.toLowerCase()] = value;
            },
        });
        await route(
            new RequestRecorder({
                token,
                method,
                body: JSON.stringify(query),
            }) as never,
            response as never,
            new URL("http://localhost/api/v1/study/library/dictionary/context"),
        );
        return response;
    };
    assert.equal((await request("missing")).statusCode, 401);
    assert.equal((await request("alice", "PUT")).statusCode, 200);
    const own = await request("alice");
    assert.deepEqual(JSON.parse(own.payload).data, query);
    assert.equal(own.headers["cache-control"], "no-store");
    assert.equal(JSON.parse((await request("bob")).payload).data, null);
    assert.equal((await request("guest", "PUT")).statusCode, 403);
});
