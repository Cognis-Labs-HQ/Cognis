import test from "node:test";
import assert from "node:assert/strict";
import { createSearchRoutes } from "../routes/search/index.js";
import { issueAccessToken } from "../../gateways/auth/access-tokens.js";

function makeReq(token: string) {
    return {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

test("global search includes hidden profiles for admins", async () => {
    const adminToken = issueAccessToken("admin", "admin", 60);
    const calls: Array<{
        query: string;
        limit: number;
        options?: { includeHidden?: boolean };
    }> = [];
    const route = createSearchRoutes(async (query, limit, options) => {
        calls.push({ query, limit, options });
        return options?.includeHidden
            ? [
                  {
                      accountId: "hidden-user-id",
                      handle: "hidden-user",
                      displayName: "Hidden User",
                  },
              ]
            : [];
    });
    let status = 0;
    let body = "";

    await route(
        makeReq(adminToken),
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/search?q=hidden&type=users"),
    );

    assert.equal(status, 200);
    assert.deepEqual(calls, [
        { query: "hidden", limit: 10, options: { includeHidden: true } },
    ]);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.length, 1);
    assert.equal(parsed.data[0].handle, "hidden-user");
});

test("global search excludes hidden profiles for regular users", async () => {
    const userToken = issueAccessToken("alice", "user", 60);
    const calls: Array<{
        query: string;
        limit: number;
        options?: { includeHidden?: boolean };
    }> = [];
    const route = createSearchRoutes(async (query, limit, options) => {
        calls.push({ query, limit, options });
        return options?.includeHidden
            ? [
                  {
                      accountId: "hidden-user-id",
                      handle: "hidden-user",
                      displayName: "Hidden User",
                  },
              ]
            : [];
    });
    let status = 0;
    let body = "";

    await route(
        makeReq(userToken),
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/search?q=hidden&type=users"),
    );

    assert.equal(status, 200);
    assert.deepEqual(calls, [
        { query: "hidden", limit: 10, options: { includeHidden: false } },
    ]);
    const parsed = JSON.parse(body);
    assert.deepEqual(parsed.data, []);
});
