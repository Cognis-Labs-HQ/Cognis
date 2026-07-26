import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    createCtx,
    CapabilityStore,
    CTX_CAPABILITY,
    GatewayRegistry,
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
    dispatchRoute,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { bootstrap } from "../bootstrap.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";

class MemoryExecutor {
    public readonly rows = new Map<string, Record<string, unknown>>();
    async ensureTable(_def: StructuredDbTableDef): Promise<void> {}
    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        if (command.table !== "share_tokens") {
            return { rows: [] };
        }
        if (command.option === "INSERT") {
            this.rows.set(String(command.values.id), { ...command.values });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            const entries = Array.from(this.rows.values()).filter((row) =>
                (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                ),
            );
            return { rows: entries };
        }
        if (command.option === "DELETE") {
            for (const [key, row] of this.rows.entries()) {
                const matches = (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                );
                if (matches) this.rows.delete(key);
            }
            return { rowCount: 1 };
        }
        return { rowCount: 0 };
    }
    async transaction<T>(
        callback: (executor: MemoryExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }
}

test("share bootstrap registers gateway routes and serves share html", async () => {
    const routeRegistry = new RouteRegistry();
    const gatewayRegistry = new GatewayRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const dbExecutor = new MemoryExecutor();
    const adminToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "user", 60);
    capabilities.contribute("db:executor", dbExecutor as never);
    capabilities.contribute("notify:gateway", {
        listSenders() {
            return [
                {
                    senderId: "smtp",
                    name: "SMTP Email",
                    active: true,
                },
            ];
        },
    } as never);
    capabilities.contribute(
        "notify:quickShare:smtp",
        ((input: { shareUrl: string; label?: string | null }) =>
            `mailto:?body=${encodeURIComponent(
                `${String(input.label ?? "")}\n${input.shareUrl}`,
            )}`) as never,
    );
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(
            new Map([
                [adminToken, { sub: "alice", role: "admin" }],
                [bobToken, { sub: "bob", role: "user" }],
            ]),
        ),
    );
    const flowCtx = createCtx();
    capabilities.contribute(CTX_CAPABILITY, flowCtx as never);
    for (const flow of SHARE_FLOW_CATALOG) {
        registerCanonicalFlow(flowCtx, flow);
    }
    flowCtx.flow.extend(
        "mint-share-token",
        "validate-resource",
        { id: "test:unsupported-resource" },
        () => ({ valid: false, reason: "unsupported_resource_type" }),
    );
    flowCtx.flow.extend(
        "mint-share-token",
        "validate-resource",
        { id: "test:validate-resource" },
        () => ({
            valid: true,
            resourceType: "meeting",
            resourceId: "meeting-1",
            ownerAccountId: "alice",
        }),
    );
    flowCtx.flow.extend(
        "mint-share-token",
        "authorize-minter",
        { id: "test:unsupported-minter" },
        () => ({ authorized: false, reason: "unsupported_resource_type" }),
    );
    flowCtx.flow.extend(
        "mint-share-token",
        "authorize-minter",
        { id: "test:authorize-minter" },
        () => ({ authorized: true, ownerAccountId: "alice" }),
    );
    flowCtx.flow.extend(
        "revoke-share-token",
        "authorize-revocation",
        { id: "test:unsupported-revocation" },
        () => ({ authorized: false, reason: "unsupported_resource_type" }),
    );
    flowCtx.flow.extend(
        "revoke-share-token",
        "authorize-revocation",
        { id: "test:authorize-revocation" },
        (stageCtx) => ({ authorized: true, ...(stageCtx.input ?? {}) }),
    );
    flowCtx.flow.extend(
        "resolve-share-token",
        "resolve-resource",
        { id: "test:resolve-resource" },
        () => ({
            resolved: true,
            resourceType: "meeting",
            resourceId: "meeting-1",
            payload: { title: "Planning" },
        }),
    );
    flowCtx.flow.extend(
        "resolve-share-token",
        "check-access",
        { id: "test:check-access" },
        () => ({ allowed: true }),
    );
    flowCtx.flow.extend(
        "construct-share-page",
        "resolve-resource-renderer",
        { id: "test:unsupported-renderer" },
        () => null,
    );
    flowCtx.flow.extend(
        "construct-share-page",
        "resolve-resource-renderer",
        { id: "test:renderer" },
        () => ({
            rendererScriptUrl: "/static/modules/jitsi-meet/share-renderer.js",
        }),
    );

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: flowCtx.flow,
    } as never);

    assert.equal(gatewayRegistry.get("share")?.id, "share");
    assert.equal(
        uiRegistry.getStaticDir("share")?.endsWith("src/gateways/share"),
        true,
    );
    assert.equal(
        uiRegistry
            .getAdapterStaticDir("share", "link")
            ?.endsWith("src/adapters/share/link"),
        true,
    );
    assert.equal(
        uiRegistry
            .getAdapterStaticDir("share", "user")
            ?.endsWith("src/adapters/share/user"),
        true,
    );

    const response = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET" }),
        response,
        new URL("http://localhost/share/test-token"),
    );
    assert.equal(response.statusCode, 200);
    assert.match(
        response.payload,
        /share.page_title|Shared Content|<main id="app">/,
    );

    const dispatchJson = createJsonDispatcher(routeRegistry);
    const createResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join"],
        },
    );
    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.data.resourceType, "meeting");
    assert.equal(createResponse.body.data.quickShareActions.length, 1);
    assert.equal(createResponse.body.data.quickShareActions[0].id, "smtp");
    assert.match(
        createResponse.body.data.quickShareActions[0].href,
        /^mailto:/,
    );

    const listResponse = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/share/tokens?resourceType=meeting&resourceId=meeting-1",
    );
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.data.length, 1);
    assert.equal(listResponse.body.data[0].quickShareActions.length, 1);
    assert.equal(listResponse.body.data[0].quickShareActions[0].id, "smtp");

    const resolveResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET" }),
        resolveResponse,
        new URL(
            `http://localhost/api/v1/share/resolve/${encodeURIComponent(createResponse.body.data.shareUrl.split("/share/")[1])}`,
        ),
    );
    assert.equal(resolveResponse.statusCode, 200);
    assert.equal(
        JSON.parse(resolveResponse.payload).data.resourceType,
        "meeting",
    );

    const restrictedCreateResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            accessControls: {
                recipients: [{ type: "user", id: "bob" }],
            },
        },
    );
    assert.equal(restrictedCreateResponse.statusCode, 200);
    const restrictedToken = encodeURIComponent(
        restrictedCreateResponse.body.data.shareUrl.split("/share/")[1],
    );

    const anonymousRestrictedResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET" }),
        anonymousRestrictedResponse,
        new URL(`http://localhost/api/v1/share/resolve/${restrictedToken}`),
    );
    assert.equal(anonymousRestrictedResponse.statusCode, 403);
    assert.equal(
        JSON.parse(anonymousRestrictedResponse.payload).error.code,
        "recipient_restricted",
    );

    const bobRestrictedResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "GET",
            headers: { authorization: `Bearer ${bobToken}` },
        }),
        bobRestrictedResponse,
        new URL(`http://localhost/api/v1/share/resolve/${restrictedToken}`),
    );
    assert.equal(bobRestrictedResponse.statusCode, 200);
});
