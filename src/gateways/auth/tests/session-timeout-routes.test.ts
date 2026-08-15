import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore } from "@cognis/core";
import { createSecurityRoutes } from "../bootstrap/routes/security.js";
import { issueAccessToken } from "../access-tokens.js";
import { makeResponse } from "./auth-gateway-test-helpers.js";

test("a user timeout preference survives compatible administration updates", async () => {
    const capabilities = new CapabilityStore();
    let maximumMinutes = 720;
    capabilities.contribute("preferences:store", {
        async get(accountId: string, key: string) {
            assert.equal(accountId, "alice");
            assert.equal(key, "login-session-timeout-minutes");
            return "120";
        },
        async set() {},
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
