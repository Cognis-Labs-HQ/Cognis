import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore } from "@cognis/core";
import { createSecurityRoutes } from "../bootstrap/routes/security.js";
import {
    issueAccessToken,
    revokeAccessTokensForSubject,
    verifyAccessToken,
} from "../access-tokens.js";
import { makeJsonRequest, makeResponse } from "./auth-gateway-test-helpers.js";
import { parseLoginSessionTimeoutMinutes } from "../session-timeout.js";

test("auth bootstrap preserves a globally disabled session timeout", () => {
    assert.equal(parseLoginSessionTimeoutMinutes(0), 0);
    assert.equal(parseLoginSessionTimeoutMinutes(720), 720);
    assert.equal(parseLoginSessionTimeoutMinutes(-1), 720);
});

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
    capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeAccessTokensForSubject,
    );
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
    const updateResponse = makeResponse();
    await route(
        makeJsonRequest(
            "PUT",
            { timeoutMinutes: 90 },
            { authorization: `Bearer ${token}` },
        ),
        updateResponse as unknown as import("node:http").ServerResponse,
        new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
        { component: "auth", method: "PUT", path: "session-timeout" },
    );
    assert.equal(updateResponse.status, 200);
    assert.equal(storedTimeout, "90");
    assert.equal(verifyAccessToken(token), null);
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
    capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeAccessTokensForSubject,
    );
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
    assert.equal(verifyAccessToken(token), null);
    maximumMinutes = 1440;
    const refreshedToken = issueAccessToken("alice", "user", 60);
    const getResponse = makeResponse();
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${refreshedToken}` },
        } as import("node:http").IncomingMessage,
        getResponse as unknown as import("node:http").ServerResponse,
        new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
        { component: "auth", method: "GET", path: "session-timeout" },
    );
    const payload = JSON.parse(getResponse.payload).data;
    assert.equal(payload.timeoutMinutes, 1440);
    assert.equal(payload.usesDefault, true);
});

test("timeout updates fail without preference storage and preserve sessions", async () => {
    const capabilities = new CapabilityStore();
    capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeAccessTokensForSubject,
    );
    const route = createSecurityRoutes({
        capabilities,
        securitySubsections: [],
        registrationsEnabled: async () => false,
        readSecuritySettings: async () => ({
            registrationsEnabled: false,
            userValidationMode: "none",
            loginSessionTimeoutMinutes: 60,
        }),
    });
    const token = issueAccessToken("storage-less-user", "user", 60);
    const response = makeResponse();

    await route(
        makeJsonRequest(
            "PUT",
            { timeoutMinutes: 30 },
            { authorization: `Bearer ${token}` },
        ),
        response as unknown as import("node:http").ServerResponse,
        new URL("/api/v1/auth/login-session-timeout", "http://localhost"),
        { component: "auth", method: "PUT", path: "session-timeout" },
    );

    assert.equal(response.status, 503);
    assert.equal(
        JSON.parse(response.payload).error.code,
        "preferences_unavailable",
    );
    assert.notEqual(verifyAccessToken(token), null);
});
