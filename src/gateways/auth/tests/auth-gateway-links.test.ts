import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";
import { dispatchRoute, makeJsonRequest } from "./auth-gateway-test-helpers.js";

test("POST /api/v1/auth/request-login-link sends a password reset link and consumes it once", async () => {
    const previousExternalHost = process.env.EXTERNAL_HOST;
    process.env.EXTERNAL_HOST = "https://cognis.example.com";
    try {
        const gatewayRegistry = new GatewayRegistry();
        const routeRegistry = new RouteRegistry();
        const capabilities = new CapabilityStore();
        const db = new InMemoryTestExecutor();
        let sentLink = "";
        capabilities.contribute("notify:canSendOneTimeLoginEmail", () => true);
        capabilities.contribute(
            "notify:getAccountIdByEmail",
            async (email: string) =>
                email === "alice@example.com" ? "alice" : null,
        );
        capabilities.contribute(
            "notify:sendOneTimeLoginEmail",
            async (_to: string, loginUrl: string) => {
                sentLink = loginUrl;
            },
        );

        await bootstrap({
            dbExecutor: db,
            adaptersRoot: "/nonexistent",
            routeRegistry,
            gatewayRegistry,
            capabilities,
        });

        const accountStore = capabilities.get<{
            register: (username: string, password: string) => Promise<unknown>;
        }>("auth:accountStore");
        await accountStore?.register("alice", "pass12345");

        const requestResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", { email: "alice@example.com" }),
            "/api/v1/auth/request-login-link",
        );
        assert.equal(requestResult.handled, true);
        assert.equal(requestResult.res.status, 200);
        assert.match(
            sentLink,
            /^https:\/\/cognis\.example\.com\/login\?passwordResetToken=/,
        );

        const sentUrl = new URL(sentLink);
        const loginToken = sentUrl.searchParams.get("passwordResetToken") ?? "";
        assert.ok(loginToken, "expected password reset token in emailed URL");

        const consumeResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                token: loginToken,
                password: "new-pass-123",
            }),
            "/api/v1/auth/consume-login-link",
        );
        assert.equal(consumeResult.handled, true);
        assert.equal(consumeResult.res.status, 200);
        assert.match(consumeResult.res.payload, /"updated":true/);

        const loginResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                provider: "local",
                username: "alice",
                password: "new-pass-123",
            }),
            "/api/v1/auth/login",
        );
        assert.equal(loginResult.handled, true);
        assert.equal(loginResult.res.status, 200);

        const reuseResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                token: loginToken,
                password: "newer-pass-123",
            }),
            "/api/v1/auth/consume-login-link",
        );
        assert.equal(reuseResult.handled, true);
        assert.equal(reuseResult.res.status, 401);
        assert.match(reuseResult.res.payload, /invalid_token/);
    } finally {
        if (previousExternalHost === undefined) {
            delete process.env.EXTERNAL_HOST;
        } else {
            process.env.EXTERNAL_HOST = previousExternalHost;
        }
    }
});

test("POST /api/v1/auth/consume-login-link rejects concurrent reuse before first reset completes", async () => {
    const previousExternalHost = process.env.EXTERNAL_HOST;
    process.env.EXTERNAL_HOST = "https://cognis.example.com";
    try {
        const gatewayRegistry = new GatewayRegistry();
        const routeRegistry = new RouteRegistry();
        const capabilities = new CapabilityStore();
        const db = new InMemoryTestExecutor();
        let sentLink = "";
        capabilities.contribute("notify:canSendOneTimeLoginEmail", () => true);
        capabilities.contribute(
            "notify:getAccountIdByEmail",
            async (email: string) =>
                email === "alice@example.com" ? "alice" : null,
        );
        capabilities.contribute(
            "notify:sendOneTimeLoginEmail",
            async (_to: string, loginUrl: string) => {
                sentLink = loginUrl;
            },
        );

        await bootstrap({
            dbExecutor: db,
            adaptersRoot: "/nonexistent",
            routeRegistry,
            gatewayRegistry,
            capabilities,
        });

        const accountStore = capabilities.get<{
            register: (username: string, password: string) => Promise<unknown>;
            setPassword: (username: string, password: string) => Promise<void>;
        }>("auth:accountStore");
        await accountStore?.register("alice", "pass12345");

        const requestResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", { email: "alice@example.com" }),
            "/api/v1/auth/request-login-link",
        );
        assert.equal(requestResult.handled, true);
        assert.equal(requestResult.res.status, 200);

        const sentUrl = new URL(sentLink);
        const loginToken = sentUrl.searchParams.get("passwordResetToken") ?? "";
        assert.ok(loginToken, "expected password reset token in emailed URL");
        assert.ok(accountStore, "expected auth account store capability");

        const originalSetPassword = accountStore.setPassword.bind(accountStore);
        let setPasswordCallCount = 0;
        let releaseFirstSetPassword = () => {};
        const firstSetPasswordStarted = new Promise<void>((resolve) => {
            const firstSetPasswordUnblocked = new Promise<void>((release) => {
                releaseFirstSetPassword = release;
            });
            accountStore.setPassword = async (
                username: string,
                password: string,
            ) => {
                setPasswordCallCount += 1;
                if (setPasswordCallCount === 1) {
                    resolve();
                    await firstSetPasswordUnblocked;
                }
                await originalSetPassword(username, password);
            };
        });

        const firstConsumePromise = dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                token: loginToken,
                password: "first-new-pass-123",
            }),
            "/api/v1/auth/consume-login-link",
        );
        await firstSetPasswordStarted;

        const secondConsumeResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                token: loginToken,
                password: "second-new-pass-123",
            }),
            "/api/v1/auth/consume-login-link",
        );
        assert.equal(secondConsumeResult.handled, true);
        assert.equal(secondConsumeResult.res.status, 401);
        assert.match(secondConsumeResult.res.payload, /invalid_token/);
        assert.equal(setPasswordCallCount, 1);

        releaseFirstSetPassword();
        const firstConsumeResult = await firstConsumePromise;
        assert.equal(firstConsumeResult.handled, true);
        assert.equal(firstConsumeResult.res.status, 200);
        assert.match(firstConsumeResult.res.payload, /"updated":true/);
        assert.equal(setPasswordCallCount, 1);

        const loginResult = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", {
                provider: "local",
                username: "alice",
                password: "first-new-pass-123",
            }),
            "/api/v1/auth/login",
        );
        assert.equal(loginResult.handled, true);
        assert.equal(loginResult.res.status, 200);
    } finally {
        if (previousExternalHost === undefined) {
            delete process.env.EXTERNAL_HOST;
        } else {
            process.env.EXTERNAL_HOST = previousExternalHost;
        }
    }
});

test("POST /api/v1/auth/request-login-link falls back to support contact details", async () => {
    const previousContactEmail = process.env.CONTACT_EMAIL;
    process.env.CONTACT_EMAIL = "support@cognis.example.com";
    try {
        const gatewayRegistry = new GatewayRegistry();
        const routeRegistry = new RouteRegistry();
        const capabilities = new CapabilityStore();
        const db = new InMemoryTestExecutor();

        await bootstrap({
            dbExecutor: db,
            adaptersRoot: "/nonexistent",
            routeRegistry,
            gatewayRegistry,
            capabilities,
        });

        const accountStore = capabilities.get<{
            register: (username: string, password: string) => Promise<unknown>;
        }>("auth:accountStore");
        await accountStore?.register("support-user", "pass12345");

        const result = await dispatchRoute(
            routeRegistry,
            makeJsonRequest("POST", { email: "support-user@example.com" }),
            "/api/v1/auth/request-login-link",
        );
        assert.equal(result.handled, true);
        assert.equal(result.res.status, 200);
        assert.match(result.res.payload, /contact_support/);
        assert.match(result.res.payload, /support@cognis\.example\.com/);
    } finally {
        if (previousContactEmail === undefined) {
            delete process.env.CONTACT_EMAIL;
        } else {
            process.env.CONTACT_EMAIL = previousContactEmail;
        }
    }
});
