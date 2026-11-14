import test from "node:test";
import assert from "node:assert/strict";
import { createKeyringRoutes } from "../api/routes/index.js";
import { createRouteFixture } from "./route-fixture.js";

function validVault() {
    return {
        version: 1,
        accountInstanceId: "instance-1",
        iterations: 310000,
        salt: "salt",
        iv: "iv",
        cipher: "opaque-ciphertext",
        updatedAt: new Date().toISOString(),
    };
}

test("authenticated users can save and load an opaque keyring vault", async (context) => {
    const values = new Map<string, string>();
    const store = {
        async ensureSchema() {},
        async get(accountId: string) {
            return values.get(accountId) ?? null;
        },
        async set(accountId: string, value: string) {
            values.set(accountId, value);
        },
        async delete(accountId: string) {
            values.delete(accountId);
        },
    };
    const { routeContext, makeJsonRequest, makeResponse } =
        createRouteFixture(context);
    const route = createKeyringRoutes({
        routeContext,
        store,
        getAccountInstanceId: async () => "instance-1",
        purgeDependentAccountData: async (accountId) => {
            assert.equal(accountId, "keyring-user");
            values.set("dependencies-purged", "true");
        },
    });
    const token = "Keyring-User";
    const headers = { authorization: `Bearer ${token}` };

    const putResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("PUT", { vault: validVault() }, headers),
            putResponse.res,
            new URL("http://localhost/api/v1/auth/keyring"),
        ),
        true,
    );
    assert.equal(putResponse.status, 200);
    assert.equal(values.has("keyring-user"), true);
    assert.doesNotMatch(values.values().next().value ?? "", /password|secret/);

    const getResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("GET", {}, headers),
            getResponse.res,
            new URL("http://localhost/api/v1/auth/keyring"),
        ),
        true,
    );
    assert.equal(getResponse.status, 200);
    assert.match(getResponse.payload, /opaque-ciphertext/);

    const deleteResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("DELETE", {}, headers),
            deleteResponse.res,
            new URL("http://localhost/api/v1/auth/keyring"),
        ),
        true,
    );
    assert.equal(deleteResponse.status, 204);
    assert.equal(values.get("dependencies-purged"), "true");

    const emptyResponse = makeResponse();
    await route(
        makeJsonRequest("GET", {}, headers),
        emptyResponse.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.match(emptyResponse.payload, /"vault":null/);
});

test("keyring policy bounds default vaults and accepts a configured bounded increase", async (context) => {
    let stored = "";
    let policyBytes = 2 * 1024 * 1024;
    const { routeContext, makeJsonRequest, makeResponse } =
        createRouteFixture(context);
    const route = createKeyringRoutes({
        routeContext,
        store: {
            async ensureSchema() {},
            async get() {
                return null;
            },
            async set(_accountId: string, value: string) {
                stored = value;
            },
            async delete() {},
        },
        getAccountInstanceId: async () => "instance-1",
        getPolicy: () => ({
            maxVaultBytes: policyBytes,
            derivationIterations: 310000,
        }),
    });
    const token = "large-keyring-user";
    const response = makeResponse();
    const vault = {
        ...validVault(),
        cipher: "a".repeat(3 * 1024 * 1024),
    };

    await route(
        makeJsonRequest("PUT", { vault }, { authorization: `Bearer ${token}` }),
        response.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );

    assert.equal(response.status, 413);
    assert.equal(stored, "");
    policyBytes = 4 * 1024 * 1024;
    const allowed = makeResponse();
    await route(
        makeJsonRequest("PUT", { vault }, { authorization: `Bearer ${token}` }),
        allowed.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.equal(allowed.status, 200);
    assert.equal(JSON.parse(stored).cipher.length, 3 * 1024 * 1024);
});

test("keyring API rejects malformed vault payloads", async (context) => {
    const store = {
        async ensureSchema() {},
        async get() {
            return null;
        },
        async set() {},
        async delete() {},
    };
    const { routeContext, makeJsonRequest, makeResponse } =
        createRouteFixture(context);
    const route = createKeyringRoutes({
        routeContext,
        store,
        getAccountInstanceId: async () => "instance-1",
    });
    const token = "keyring-user-invalid";
    const response = makeResponse();
    await route(
        makeJsonRequest(
            "PUT",
            { vault: { version: 1 } },
            {
                authorization: `Bearer ${token}`,
            },
        ),
        response.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.equal(response.status, 400);
    assert.match(response.payload, /invalid_keyring_vault/);
});

test("keyring API purges a vault from a previous account instance", async (context) => {
    let deletedAccountId = "";
    const staleVault = {
        ...validVault(),
        accountInstanceId: "retired-instance",
    };
    const { routeContext, makeJsonRequest, makeResponse } =
        createRouteFixture(context);
    const route = createKeyringRoutes({
        routeContext,
        store: {
            async ensureSchema() {},
            async get() {
                return JSON.stringify(staleVault);
            },
            async set() {},
            async delete(accountId: string) {
                deletedAccountId = accountId;
            },
        },
        getAccountInstanceId: async () => "current-instance",
    });
    const token = "Recreated-User";
    const response = makeResponse();

    await route(
        makeJsonRequest("GET", {}, { authorization: `Bearer ${token}` }),
        response.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );

    assert.equal(deletedAccountId, "recreated-user");
    assert.match(response.payload, /"vault":null/);
    assert.match(response.payload, /"accountInstanceId":"current-instance"/);
});

test("guest keyrings require live Share admission and stay bound to the authenticated subject", async (context) => {
    const fixture = createRouteFixture(context);
    const reads: string[] = [];
    let live = true;
    const route = createKeyringRoutes({
        routeContext: {
            requireAuth: (_request, response) => {
                response.writeHead(401);
                response.end();
                return null;
            },
        },
        getGuestClaims: async () =>
            live ? { sub: "share:fixture:guest", role: "user" } : null,
        store: {
            ensureSchema: async () => {},
            get: async (account) => {
                reads.push(account);
                return null;
            },
            set: async () => {},
            delete: async () => {},
        },
        getAccountInstanceId: async (account) => `instance:${account}`,
    });
    const request = fixture.makeJsonRequest("GET", {});
    const response = fixture.makeResponse();
    await route(
        request,
        response.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(reads, ["share:fixture:guest"]);
    live = false;
    const denied = fixture.makeResponse();
    await route(
        request,
        denied.res,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.equal(denied.status, 401);
    assert.equal(reads.length, 1);
});
