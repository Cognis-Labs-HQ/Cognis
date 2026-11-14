import assert from "node:assert/strict";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    registerCanonicalFlow,
    runBootstrapScope,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
} from "../../../../api/tests/reuse/route-test-helpers.js";
import { bootstrap } from "../../bootstrap.js";

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

export async function createHost(context, configure = () => {}) {
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
    capabilities.contribute("auth:readCredentialClaims", () => null);
    configure({ capabilities, database, root });
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
        root,
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
