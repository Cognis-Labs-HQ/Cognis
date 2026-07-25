import test from "node:test";
import assert from "node:assert/strict";
import { createAuthRoutes } from "../routes/index.js";
import { VolatileLocalAccountStore } from "../reuse/account-store.js";
import type { AuthContext, AuthGateway } from "@cognis/core";
import { issueAccessToken, lookupAccessToken } from "../access-tokens.js";

function makeGateway(store: VolatileLocalAccountStore): AuthGateway {
    return {
        async authenticate(token: string): Promise<AuthContext | null> {
            let payload: { username?: string; password?: string };
            try {
                payload = JSON.parse(token) as {
                    username?: string;
                    password?: string;
                };
            } catch {
                return null;
            }
            return store.verify(
                String(payload.username ?? ""),
                String(payload.password ?? ""),
            );
        },
    };
}

function requestWithBody(
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers,
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as any;
}

test("auth routes register and login via gateway", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let status = 0;
    let payload = "";

    await route(
        requestWithBody("POST", {
            username: "u1",
            password: "p1",
            displayName: "User One",
        }),
        {
            writeHead(code: number) {
                status = code;
            },
            end(text: string) {
                payload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );
    assert.equal(status, 201);
    assert.match(payload, /"username":"u1"/);

    await route(
        requestWithBody("POST", { username: "u1", password: "p1" }),
        {
            writeHead(code: number) {
                status = code;
            },
            end(text: string) {
                payload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/login"),
    );
    assert.equal(status, 200);
    assert.match(payload, /"provider":"local"/);
    assert.match(payload, /"displayName":"User One"/);
});

test("login records lastLogin on the account", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);

    await route(
        requestWithBody("POST", { username: "u2", password: "p2" }),
        {
            writeHead() {},
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );

    const beforeLogin = await accountStore.getInfo("u2");
    assert.equal(
        beforeLogin?.lastLogin,
        null,
        "lastLogin should be null before first login",
    );

    await route(
        requestWithBody("POST", { username: "u2", password: "p2" }),
        {
            writeHead() {},
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/login"),
    );

    const afterLogin = await accountStore.getInfo("u2");
    assert.notEqual(
        afterLogin?.lastLogin,
        null,
        "lastLogin should be set after login",
    );
    assert.match(
        afterLogin!.lastLogin!,
        /^\d{4}-\d{2}-\d{2}T/,
        "lastLogin should be an ISO 8601 timestamp",
    );
});

test("login sets cookie max-age to token ttl", async () => {
    const previousTtl = process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS;
    const previousSecureCookies = process.env.COGNIS_SECURE_COOKIES;
    process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS = "90";
    process.env.COGNIS_SECURE_COOKIES = "false";
    try {
        const accountStore = new VolatileLocalAccountStore();
        const gateway = makeGateway(accountStore);
        const route = createAuthRoutes(gateway, accountStore);
        let setCookie = "";

        await route(
            requestWithBody("POST", { username: "u3", password: "p3" }),
            { writeHead() {}, end() {} } as any,
            new URL("http://localhost/api/v1/auth/register"),
        );

        await route(
            requestWithBody("POST", { username: "u3", password: "p3" }),
            {
                writeHead(_code: number, headers: Record<string, string>) {
                    setCookie = headers["set-cookie"];
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/auth/login"),
        );

        assert.match(setCookie, /;\sMax-Age=90(?:;|$)/);
        assert.doesNotMatch(setCookie, /;\sSecure(?:;|$)/);
    } finally {
        if (previousTtl === undefined) {
            delete process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS;
        } else {
            process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS = previousTtl;
        }
        if (previousSecureCookies === undefined) {
            delete process.env.COGNIS_SECURE_COOKIES;
        } else {
            process.env.COGNIS_SECURE_COOKIES = previousSecureCookies;
        }
    }
});

test("POST /api/v1/auth/verify returns 200 with correct password", async () => {
    const accountStore = new VolatileLocalAccountStore();
    await accountStore.register("verifyuser", "secret", false);
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    const token = issueAccessToken("verifyuser", "user", 60);
    let status = 0;
    let payload = "";

    await route(
        requestWithBody(
            "POST",
            { password: "secret" },
            { authorization: `Bearer ${token}` },
        ),
        {
            writeHead(code: number) {
                status = code;
            },
            end(text: string) {
                payload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/verify"),
    );
    assert.equal(status, 200);
    assert.match(payload, /"verified":true/);
});

test("POST /api/v1/auth/verify returns 401 with wrong password for stale session", async () => {
    const accountStore = new VolatileLocalAccountStore();
    await accountStore.register("verifyuser2", "secret", false);
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    const staleIssuedAt = Date.now() - 2 * 60 * 60 * 1000;
    const token = issueAccessToken("verifyuser2", "user", 7200, {
        issuedAt: staleIssuedAt,
    });
    let status = 0;

    await route(
        requestWithBody(
            "POST",
            { password: "wrong" },
            { authorization: `Bearer ${token}` },
        ),
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/verify"),
    );
    assert.equal(status, 401);
});

test("POST /api/v1/auth/verify returns 200 for fresh session without password check", async () => {
    const accountStore = new VolatileLocalAccountStore();
    await accountStore.register("verifyuser3", "secret", false);
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    const token = issueAccessToken("verifyuser3", "user", 3600);
    let status = 0;

    await route(
        requestWithBody(
            "POST",
            { password: "wrong" },
            { authorization: `Bearer ${token}` },
        ),
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/verify"),
    );
    assert.equal(status, 200);
});

test("POST /api/v1/auth/verify returns 401 when unauthenticated", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let status = 0;

    await route(
        requestWithBody("POST", { password: "anything" }),
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/verify"),
    );
    assert.equal(status, 401);
});

test("login sets secure cookie when request is forwarded over https", async () => {
    const previousSecureCookies = process.env.COGNIS_SECURE_COOKIES;
    delete process.env.COGNIS_SECURE_COOKIES;
    try {
        const accountStore = new VolatileLocalAccountStore();
        const gateway = makeGateway(accountStore);
        const route = createAuthRoutes(gateway, accountStore);
        let setCookie = "";

        await route(
            requestWithBody("POST", { username: "u4", password: "p4" }),
            { writeHead() {}, end() {} } as any,
            new URL("http://localhost/api/v1/auth/register"),
        );

        await route(
            requestWithBody(
                "POST",
                { username: "u4", password: "p4" },
                { "x-forwarded-proto": "https" },
            ),
            {
                writeHead(_code: number, headers: Record<string, string>) {
                    setCookie = headers["set-cookie"];
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/auth/login"),
        );

        assert.match(setCookie, /;\sSecure(?:;|$)/);
    } finally {
        if (previousSecureCookies === undefined) {
            delete process.env.COGNIS_SECURE_COOKIES;
        } else {
            process.env.COGNIS_SECURE_COOKIES = previousSecureCookies;
        }
    }
});

test("POST /api/v1/auth/logout revokes the cookie token and clears the cookie", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    const token = issueAccessToken("logout-user", "user", 3600);
    let status = 0;
    let setCookie = "";

    await route(
        {
            method: "POST",
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        {
            writeHead(code: number, headers: Record<string, string>) {
                status = code;
                setCookie = headers["set-cookie"] ?? "";
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/logout"),
    );

    assert.equal(status, 200);
    assert.match(setCookie, /cognis_access_token=;/);
    assert.match(setCookie, /Max-Age=0/);

    const tokenInfo = lookupAccessToken(token);
    assert.ok(
        tokenInfo?.revoked,
        "token should be marked as revoked after logout",
    );
});

test("POST /api/v1/auth/logout succeeds with no cookie (idempotent)", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let status = 0;

    await route(
        { method: "POST", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/logout"),
    );

    assert.equal(status, 200);
});

test("register rejects usernames with non-ASCII characters", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let status = 0;
    let payload = "";

    await route(
        requestWithBody("POST", { username: "üser", password: "pass" }),
        {
            writeHead(code: number) {
                status = code;
            },
            end(text: string) {
                payload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );

    assert.equal(status, 400);
    assert.match(payload, /"username_invalid"/);
});

test("register rejects usernames longer than 25 characters", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let status = 0;
    let payload = "";

    await route(
        requestWithBody("POST", {
            username: "abcdefghijklmnopqrstuvwxyz",
            password: "pass",
        }),
        {
            writeHead(code: number) {
                status = code;
            },
            end(text: string) {
                payload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );

    assert.equal(status, 400);
    assert.match(payload, /"username_too_long"/);
});

test("register rejects non-lowercase usernames and login is case-insensitive", async () => {
    const accountStore = new VolatileLocalAccountStore();
    const gateway = makeGateway(accountStore);
    const route = createAuthRoutes(gateway, accountStore);
    let regStatus = 0;
    let regPayload = "";

    await route(
        requestWithBody("POST", { username: "Alice", password: "pw123" }),
        {
            writeHead(code: number) {
                regStatus = code;
            },
            end(text: string) {
                regPayload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );

    assert.equal(regStatus, 400);
    assert.match(regPayload, /"username_not_lowercase"/);

    await route(
        requestWithBody("POST", { username: "alice", password: "pw123" }),
        {
            writeHead(code: number) {
                regStatus = code;
            },
            end(text: string) {
                regPayload = text;
            },
        } as any,
        new URL("http://localhost/api/v1/auth/register"),
    );

    assert.equal(regStatus, 201);
    assert.match(regPayload, /"username":"alice"/);

    let loginStatus = 0;
    await route(
        requestWithBody("POST", { username: "ALICE", password: "pw123" }),
        {
            writeHead(code: number) {
                loginStatus = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/auth/login"),
    );
    assert.equal(loginStatus, 200);
});
