import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore } from "@cognis/core";
import { issueAccessToken } from "../access-tokens.js";
import { createKeyringRoutes } from "../bootstrap/routes/keyring.js";
import { makeJsonRequest, makeResponse } from "./auth-gateway-test-helpers.js";

function validVault() {
    return {
        version: 1,
        iterations: 310000,
        salt: "salt",
        iv: "iv",
        cipher: "opaque-ciphertext",
        updatedAt: new Date().toISOString(),
    };
}

test("authenticated users can save and load an opaque keyring vault", async () => {
    const values = new Map<string, string>();
    const capabilities = new CapabilityStore();
    capabilities.contribute("preferences:store", {
        async get(accountId: string, pageId: string) {
            return values.get(`${accountId}:${pageId}`) ?? null;
        },
        async set(accountId: string, pageId: string, value: string) {
            values.set(`${accountId}:${pageId}`, value);
        },
        async clearUser() {},
    });
    const route = createKeyringRoutes(capabilities);
    const token = issueAccessToken("keyring-user", "user", 60);
    const headers = { authorization: `Bearer ${token}` };

    const putResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("PUT", { vault: validVault() }, headers),
            putResponse as any,
            new URL("http://localhost/api/v1/auth/keyring"),
            {} as any,
        ),
        true,
    );
    assert.equal(putResponse.status, 200);
    assert.doesNotMatch(values.values().next().value ?? "", /password|secret/);

    const getResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("GET", {}, headers),
            getResponse as any,
            new URL("http://localhost/api/v1/auth/keyring"),
            {} as any,
        ),
        true,
    );
    assert.equal(getResponse.status, 200);
    assert.match(getResponse.payload, /opaque-ciphertext/);

    const deleteResponse = makeResponse();
    assert.equal(
        await route(
            makeJsonRequest("DELETE", {}, headers),
            deleteResponse as any,
            new URL("http://localhost/api/v1/auth/keyring"),
            {} as any,
        ),
        true,
    );
    assert.equal(deleteResponse.status, 204);

    const emptyResponse = makeResponse();
    await route(
        makeJsonRequest("GET", {}, headers),
        emptyResponse as any,
        new URL("http://localhost/api/v1/auth/keyring"),
        {} as any,
    );
    assert.match(emptyResponse.payload, /"vault":null/);
});

test("keyring API rejects malformed vault payloads", async () => {
    const capabilities = new CapabilityStore();
    capabilities.contribute("preferences:store", {
        async get() {
            return null;
        },
        async set() {},
        async clearUser() {},
    });
    const route = createKeyringRoutes(capabilities);
    const token = issueAccessToken("keyring-user-invalid", "user", 60);
    const response = makeResponse();
    await route(
        makeJsonRequest(
            "PUT",
            { vault: { version: 1 } },
            {
                authorization: `Bearer ${token}`,
            },
        ),
        response as any,
        new URL("http://localhost/api/v1/auth/keyring"),
        {} as any,
    );
    assert.equal(response.status, 400);
    assert.match(response.payload, /invalid_keyring_vault/);
});
