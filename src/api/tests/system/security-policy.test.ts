import assert from "node:assert/strict";
import test from "node:test";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { CapabilityStore, HealthService } from "@cognis/core";
import { createSystemRoutes } from "../../routes/system/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { VolatileUserPreferenceStore } from "../../reuse/preference-store.js";
import { SECURITY_SETTINGS_KEY } from "../../reuse/security-settings.js";

function createPolicyFixture(capabilities: CapabilityStore) {
    const store = new VolatileUserPreferenceStore();
    const logs: unknown[] = [];
    const context = createDefaultRouteContext({
        getCapability: capabilities.get.bind(capabilities),
    });
    context.requireAuth = () => ({ sub: "synthetic-admin", role: "admin" });
    const route = createSystemRoutes(
        new HealthService(),
        store,
        (...args) => {
            logs.push(args);
        },
        context,
    );
    const dispatch = async (method: string, body?: Record<string, unknown>) => {
        const request = new IncomingMessage(new Socket());
        request.method = method;
        if (body) request.push(Buffer.from(JSON.stringify(body)));
        request.push(null);
        const response = new ServerResponse(request);
        let payload = "";
        response.end = (chunk?: unknown) => {
            payload = String(chunk ?? "");
            return response;
        };
        await route(
            request,
            response,
            new URL("http://localhost/api/v1/system/security"),
        );
        return { status: response.statusCode, payload: JSON.parse(payload) };
    };
    return { store, logs, dispatch };
}

for (const failure of ["missing", "throwing"]) {
    test(`system security rejects ${failure} policy provider without saving settings`, async () => {
        const capabilities = new CapabilityStore();
        if (failure === "throwing") {
            capabilities.contribute("tfa:applyEnforcementPolicy", async () => {
                throw new Error("private provider information");
            });
        }
        const { store, logs, dispatch } = createPolicyFixture(capabilities);
        const result = await dispatch("PUT", { enforceTfaForAllUsers: false });
        assert.equal(result.status, 503);
        assert.equal(result.payload.error.code, "tfa_policy_unavailable");
        assert.equal(
            await store.get("__system__", SECURITY_SETTINGS_KEY),
            null,
        );
        assert.doesNotMatch(
            JSON.stringify(logs),
            /private provider information/,
        );
    });
}

for (const initial of [true, false]) {
    test(`unrelated system write preserves direct owner policy after ${initial ? "disable" : "enable"}`, async () => {
        const capabilities = new CapabilityStore();
        let authoritative = initial;
        const applied: boolean[] = [];
        const apply = async ({ required }: { required: boolean }) => {
            const previousRequired = authoritative;
            authoritative = required;
            applied.push(required);
            return { required, previousRequired, revokedSetupPendingCount: 0 };
        };
        capabilities.contribute("tfa:applyEnforcementPolicy", apply);
        capabilities.contribute(
            "tfa:getEnforceAllUsers",
            async () => authoritative,
        );
        const { store, dispatch } = createPolicyFixture(capabilities);
        await store.set(
            "__system__",
            SECURITY_SETTINGS_KEY,
            JSON.stringify({ enforceTfaForAllUsers: initial }),
        );
        await capabilities.require<typeof apply>("tfa:applyEnforcementPolicy")({
            required: !initial,
        });
        assert.equal(
            (await dispatch("GET")).payload.data.enforceTfaForAllUsers,
            !initial,
        );
        assert.equal(
            (await dispatch("PUT", { loginSessionTimeoutMinutes: 60 })).status,
            200,
        );
        assert.deepEqual(applied, [!initial]);
        assert.equal(authoritative, !initial);
        assert.equal(
            (await dispatch("GET")).payload.data.enforceTfaForAllUsers,
            !initial,
        );
        assert.equal(
            JSON.parse((await store.get("__system__", SECURITY_SETTINGS_KEY))!)
                .enforceTfaForAllUsers,
            !initial,
        );
    });
}

for (const method of ["GET", "PUT"]) {
    test(`${method} does not report false policy when authoritative read fails`, async () => {
        const capabilities = new CapabilityStore();
        capabilities.contribute("tfa:getEnforceAllUsers", async () => {
            throw new Error("private policy read");
        });
        const { store, logs, dispatch } = createPolicyFixture(capabilities);
        const result = await dispatch(
            method,
            method === "PUT" ? { loginSessionTimeoutMinutes: 60 } : undefined,
        );
        assert.equal(result.status, 503);
        assert.equal(result.payload.error.code, "tfa_policy_unavailable");
        assert.equal(
            await store.get("__system__", SECURITY_SETTINGS_KEY),
            null,
        );
        assert.doesNotMatch(JSON.stringify(logs), /private policy read/);
    });
}
