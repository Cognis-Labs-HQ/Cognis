import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    registerCanonicalFlow,
    runBootstrapScope,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { bootstrap } from "../bootstrap.js";
import { isExpired } from "../gateway/store.js";

class MemoryDatabase {
    tables = new Map();

    async ensureTable(definition) {
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    async executeCommand(command) {
        const rows = this.tables.get(command.table);
        assert.ok(rows, `Undeclared table: ${command.table}`);
        const matches = (row) =>
            (command.where ?? []).every((condition) => {
                const value = row[condition.column];
                switch (condition.operator ?? "=") {
                    case "=":
                        return value === condition.value;
                    case "!=":
                        return value !== condition.value;
                    case "<":
                        return value < condition.value;
                    default:
                        throw new Error(
                            `Unsupported condition: ${condition.operator}`,
                        );
                }
            });
        if (command.option === "SELECT") {
            const selected = rows.filter(matches);
            return {
                rows: (command.limit
                    ? selected.slice(0, command.limit)
                    : selected
                ).map((row) => ({ ...row })),
            };
        }
        if (command.option === "INSERT") {
            const existing =
                command.conflict &&
                rows.find((row) =>
                    command.conflict.target.every(
                        (key) => row[key] === command.values[key],
                    ),
                );
            if (existing) Object.assign(existing, command.conflict.update);
            else rows.push({ ...command.values });
            return { rowCount: 1 };
        }
        const selected = rows.filter(matches);
        if (command.option === "UPDATE") {
            selected.forEach((row) => Object.assign(row, command.set));
        } else if (command.option === "DELETE") {
            this.tables.set(
                command.table,
                rows.filter((row) => !matches(row)),
            );
        } else {
            throw new Error(`Unsupported command: ${command.option}`);
        }
        return { rowCount: selected.length };
    }

    async transaction(callback) {
        return callback(this);
    }
}

async function createHost(context) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const database = new MemoryDatabase();
    const routes = new RouteRegistry();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", database);
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(
            new Map([
                ["owner-token", { sub: "owner", role: "admin" }],
                ["recipient-token", { sub: "recipient", role: "user" }],
            ]),
        ),
    );
    for (const flow of SHARE_FLOW_CATALOG) registerCanonicalFlow(root, flow);
    const disposers = [];
    context.after(async () => {
        for (const dispose of disposers.reverse()) await dispose();
    });
    await runBootstrapScope(
        root,
        "gateway:share",
        () =>
            bootstrap({
                capabilities,
                flow: root.flow,
                routeRegistry: routes,
                gatewayRegistry: new GatewayRegistry(),
            }),
        (dispose) => disposers.push(dispose),
    );

    // A resource consumer authorizes through the published Share capability.
    root.registerFlow({
        id: "fixture:read-resource",
        stages: ["authorize", "read"],
    });
    root.flow.extend(
        "fixture:read-resource",
        "authorize",
        { id: "fixture:share-grant" },
        async ({ input, data }) => {
            const result = await capabilities.require(
                "share:resolveUserAccess",
            )(input);
            data.authorized = result.authorized;
        },
    );
    root.flow.extend(
        "fixture:read-resource",
        "read",
        { id: "fixture:resource" },
        ({ data }) => {
            if (!data.authorized) throw new Error("resource_access_denied");
            return { title: "Shared fixture" };
        },
    );
    return {
        database,
        capabilities,
        dispatch: createJsonDispatcher(routes),
        issue: (options = {}) =>
            capabilities.require("share:mintToken")({
                ownerAccountId: "owner",
                resourceType: "fixture",
                resourceId: "resource-1",
                metadata: { adapterId: "user" },
                accessControls: {
                    recipients: [{ type: "user", id: "recipient" }],
                },
                grantedCapabilities: ["read"],
                expiresAt: "",
                ...options,
            }),
        read: (options = {}) =>
            root.flow.run("fixture:read-resource", {
                accountId: "recipient",
                resourceType: "fixture",
                resourceId: "resource-1",
                requiredCapability: "read",
                ...options,
            }),
    };
}

test("registered Share grants enforce expiration without losing recipient, password or adapter checks", async (context) => {
    const host = await createHost(context);
    const share = await host.issue({
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        password: "synthetic-fixture-password",
    });
    await assert.rejects(host.read(), /resource_access_denied/);
    const unlock = host.capabilities.require("share:unlockUserAccess");
    const unlockInput = {
        shareId: share.id,
        accountId: "recipient",
        resourceType: "fixture",
        resourceId: "resource-1",
        requiredCapability: "read",
    };
    assert.equal(await unlock({ ...unlockInput, password: "wrong" }), false);
    assert.equal(
        await unlock({
            ...unlockInput,
            password: "synthetic-fixture-password",
        }),
        true,
    );
    await host.read();
    await assert.rejects(
        host.read({ accountId: "stranger" }),
        /resource_access_denied/,
    );
    await assert.rejects(
        host.read({ requiredCapability: "write" }),
        /resource_access_denied/,
    );
    await assert.rejects(
        host.read({ resourceId: "missing" }),
        /resource_access_denied/,
    );
    const stored = host.database.tables
        .get("share_tokens")
        .find((row) => row.id === share.id);
    stored.expires_at = new Date(Date.now() - 60_000).toISOString();
    await assert.rejects(host.read(), /resource_access_denied/);
    assert.ok(
        await host.capabilities.require("share:getTokenById")(share.id),
        "Expired history remains retained",
    );
    stored.password_hash = null;
    await assert.rejects(host.read(), /resource_access_denied/);
    stored.expires_at = "not-a-date";
    await assert.rejects(host.read(), /resource_access_denied/);
    stored.expires_at = "";
    await host.read();
    const disabled = await host.dispatch(
        "POST",
        "owner-token",
        "/api/v1/gateways/share/adapters/user/disable",
    );
    assert.equal(disabled.statusCode, 200);
    await assert.rejects(host.read(), /resource_access_denied/);
    const enabled = await host.dispatch(
        "POST",
        "owner-token",
        "/api/v1/gateways/share/adapters/user/enable",
    );
    assert.equal(enabled.statusCode, 200);
    await host.read();
    stored.metadata = JSON.stringify({ adapterId: "unavailable" });
    await assert.rejects(host.read(), /resource_access_denied/);
});

test("PATCH replaces empty grants, preserves omitted grants and enforces subsequent access", async (context) => {
    const host = await createHost(context);
    const share = await host.issue();
    const endpoint = `/api/v1/share/tokens/${share.id}`;
    await host.read();
    const denied = await host.dispatch("PATCH", "recipient-token", endpoint, {
        grantedCapabilities: [],
    });
    assert.equal(denied.statusCode, 404);
    await host.read();
    const omitted = await host.dispatch("PATCH", "owner-token", endpoint, {
        label: "Renamed",
    });
    assert.equal(omitted.statusCode, 200);
    assert.deepEqual(omitted.body.data.grantedCapabilities, ["read"]);
    await host.read();
    const replaced = await host.dispatch("PATCH", "owner-token", endpoint, {
        grantedCapabilities: ["write"],
    });
    assert.equal(replaced.statusCode, 200);
    assert.deepEqual(replaced.body.data.grantedCapabilities, ["write"]);
    await assert.rejects(host.read(), /resource_access_denied/);
    await host.read({ requiredCapability: "write" });
    const revoked = await host.dispatch("PATCH", "owner-token", endpoint, {
        grantedCapabilities: [],
    });
    assert.equal(revoked.statusCode, 200);
    assert.deepEqual(revoked.body.data.grantedCapabilities, []);
    const stored = await host.capabilities.require("share:getTokenById")(
        share.id,
    );
    assert.deepEqual(stored.grantedCapabilities, []);
    await assert.rejects(
        host.read({ requiredCapability: "write" }),
        /resource_access_denied/,
    );
    await assert.rejects(host.read(), /resource_access_denied/);
});

test("expiry policy preserves only the empty sentinel and rejects elapsed or malformed dates", (context) => {
    const now = Date.parse("2026-11-13T12:00:00.000Z");
    context.mock.method(Date, "now", () => now);
    assert.equal(isExpired(""), false);
    assert.equal(isExpired(new Date(now + 1).toISOString()), false);
    assert.equal(isExpired(new Date(now).toISOString()), true);
    assert.equal(isExpired(new Date(now - 1).toISOString()), true);
    assert.equal(isExpired("not-a-date"), true);
    assert.equal(isExpired(" "), true);
});
