import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore } from "@cognis/core";
import { createSecurityRoutes } from "../bootstrap/routes/security.js";
import { issueAccessToken } from "../access-tokens.js";
import { makeJsonRequest, makeResponse } from "./auth-gateway-test-helpers.js";

test("a user timeout preference survives compatible administration updates", async () => {
    const capabilities = new CapabilityStore();
    let maximumMinutes = 720;
    let storedTimeout = "120";
    capabilities.contribute("preferences:store", {
        async get(accountId: string, key: string) {
            assert.equal(accountId, "alice");
            assert.equal(key, "login-session-timeout-minutes");
            return storedTimeout;
        },
        async set(_accountId: string, _key: string, value: string) {
            storedTimeout = value;
        },
        async delete() {},
        async list() {
            return [];
        },
    });
    const route = createSecurityRoutes({
        capabilities,
        securitySubsections: [],
        registrationsEnabled: async () => false,
        readSecuritySettings: async () => ({
            registrationsEnabled: false,
            userValidationMode: "none",
            loginSessionTimeoutMinutes: maximumMinutes,
        }),
    });
    const token = issueAccessToken("alice", "user", 60);

    async function readTimeout() {
        const response = makeResponse();
        await route(
            {
                method: "GET",
                headers: { authorization: `Bearer ${token}` },
            } as import("node:http").IncomingMessage,
            response as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
            { component: "auth", method: "GET", path: "session-timeout" },
        );
        assert.equal(response.status, 200);
        return JSON.parse(response.payload).data.timeoutMinutes as number;
    }

    assert.equal(await readTimeout(), 120);
    maximumMinutes = 240;
    assert.equal(await readTimeout(), 120);
    maximumMinutes = 60;
    assert.equal(await readTimeout(), 60);
    maximumMinutes = 240;
    assert.equal(await readTimeout(), 120);
});

test("resetting a user timeout follows subsequent administration updates", async () => {
    const capabilities = new CapabilityStore();
    let maximumMinutes = 720;
    let storedTimeout = "120";
    capabilities.contribute("preferences:store", {
        async get() {
            return storedTimeout;
        },
        async set(_accountId: string, _key: string, value: string) {
            storedTimeout = value;
        },
        async clearUser() {},
    });
    const route = createSecurityRoutes({
        capabilities,
        securitySubsections: [],
        registrationsEnabled: async () => false,
        readSecuritySettings: async () => ({
            registrationsEnabled: false,
            userValidationMode: "none",
            loginSessionTimeoutMinutes: maximumMinutes,
        }),
    });
    const token = issueAccessToken("alice", "user", 60);
    const headers = { authorization: `Bearer ${token}` };
    const resetResponse = makeResponse();

    await route(
        makeJsonRequest("PUT", { useDefault: true }, headers),
        resetResponse as unknown as import("node:http").ServerResponse,
        new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
        { component: "auth", method: "PUT", path: "session-timeout" },
    );

    assert.equal(resetResponse.status, 200);
    assert.equal(storedTimeout, "global");
    maximumMinutes = 1440;
    const getResponse = makeResponse();
    await route(
        {
            method: "GET",
            headers,
        } as import("node:http").IncomingMessage,
        getResponse as unknown as import("node:http").ServerResponse,
        new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
        { component: "auth", method: "GET", path: "session-timeout" },
    );
    const payload = JSON.parse(getResponse.payload).data;
    assert.equal(payload.timeoutMinutes, 1440);
    assert.equal(payload.usesDefault, true);
});
