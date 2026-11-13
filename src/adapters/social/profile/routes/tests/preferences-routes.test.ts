import test from "node:test";
import assert from "node:assert/strict";
import {
    createPreferencesRoutes,
    VolatileUserPreferenceStore,
} from "../preferences.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";

test("preferences routes save and load layout preferences", async () => {
    const route = createPreferencesRoutes(new VolatileUserPreferenceStore());
    let body = "";
    const token = issueAccessToken("u1", "user", 60);
    const reqHeaders = { authorization: `Bearer ${token}` };

    await route(
        {
            method: "PUT",
            headers: reqHeaders,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"layout":{"a":1}}');
            },
        } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/users/u1/preferences/home"),
    );
    assert.match(body, /"saved":true/);

    await route(
        { method: "GET", headers: reqHeaders } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/users/u1/preferences/home"),
    );
    assert.match(body, /layoutJson/);
});

test("preferences routes allow reading another user's profile-banner layout", async () => {
    const store = new VolatileUserPreferenceStore();
    await store.set(
        "u1",
        "profile-banner",
        JSON.stringify({ height: "half", panX: 25, panY: 40 }),
    );
    const route = createPreferencesRoutes(store);
    const token = issueAccessToken("u2", "user", 60);
    let status = 0;
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + token },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/users/u1/preferences/profile-banner",
        ),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(
        parsed?.data?.layoutJson,
        JSON.stringify({ height: "half", panX: 25, panY: 40 }),
    );
});

test("preferences routes still deny reading another user's non-banner preference", async () => {
    const store = new VolatileUserPreferenceStore();
    await store.set("u1", "home", JSON.stringify({ a: 1 }));
    const route = createPreferencesRoutes(store);
    const token = issueAccessToken("u2", "user", 60);
    let status = 0;
    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + token },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/social/users/u1/preferences/home"),
    );
    assert.equal(status, 403);
});
