import test from "node:test";
import assert from "node:assert/strict";
import { createAuthRoutes } from "../../routes/auth/index.js";
import { VolatileLocalAccountStore } from "../../reuse/account-store.js";
import type { AuthContext, AuthGateway } from "@cognis/core";

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

function requestWithBody(method: string, body: Record<string, unknown>) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
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
        requestWithBody("POST", { username: "u1", password: "p1" }),
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
