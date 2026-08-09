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
        if (command.option === "UPDATE") {
            let rowCount = 0;
            for (const [key, row] of this.rows.entries()) {
                const matches = (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                );
                if (!matches) continue;
                this.rows.set(key, { ...row, ...command.values });
                rowCount += 1;
            }
            return { rowCount };
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
    capabilities.contribute("auth:issueAccessToken", issueAccessToken);
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
    const shareEmailRecipients: string[] = [];
    const shareEmailVariables: Array<Record<string, string>> = [];
    const userShareNotifications: Array<Record<string, unknown>> = [];
    const notificationCategories: string[] = [];
    capabilities.contribute("notify:registerCategory", ((id: string) =>
        notificationCategories.push(id)) as never);
    capabilities.contribute("notify:dispatch", ((
        envelope: Record<string, unknown>,
    ) => {
        userShareNotifications.push(envelope);
        return Promise.resolve({ dispatched: ["internal"] });
    }) as never);
    capabilities.contribute("notify:sendEmail", ((emailInput: {
        recipientEmail: string;
        templateId: string;
        variables: Record<string, string>;
    }) => {
        assert.equal(emailInput.templateId, "share-link");
        shareEmailRecipients.push(emailInput.recipientEmail);
        shareEmailVariables.push(emailInput.variables);
        return Promise.resolve({ dispatched: ["smtp"] });
    }) as never);
    capabilities.contribute("share:resolveVariants", ((input: {
        token: string;
        shareUrl: string;
    }) => [
        {
            id: "web",
            label: "Web",
            url: input.shareUrl,
            contentType: "text/html",
        },
        {
            id: "feed",
            label: "Feed",
            url: `/feeds/${encodeURIComponent(input.token)}`,
            contentType: "text/calendar",
        },
    ]) as never);
    const deliveredShares: Array<Record<string, unknown>> = [];
    capabilities.contribute("share:deliverUserShare:meeting", (async (
        delivery: Record<string, unknown>,
    ) => {
        deliveredShares.push(delivery);
        return {
            navigationUrl: "/meetings/shared",
            feedback: {
                messageKey: "meeting.share_imported",
                stringsBaseUrl: ["/static/modules/meeting/languages"],
            },
        };
    }) as never);
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
            contentUrl: "/meetings?meeting=meeting-1",
            ownerAccountId: "alice",
            metadata: {
                resourceName: "Project Sync",
                resourceTypeLabel: "meeting",
            },
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
    assert.deepEqual(
        uiRegistry.listSpaRoutes().find((route) => route.id === "share-view"),
        {
            id: "share-view",
            pattern: "^/share/[^/]+$",
            base: "/share",
            scriptUrl: "/static/gateways/share/ui/app/index.js",
            stylesheets: [
                "/static/styles/page-builder.css",
                "/static/styles/reuse/layout.css",
                "/static/styles/reuse/page-sections.css",
                "/static/gateways/share/ui/app/share-layout.css",
            ],
        },
    );
    assert.equal(
        uiRegistry.listSpaRoutes().find((route) => route.id === "shares-page")
            ?.scriptUrl,
        "/static/gateways/share/ui/app/shares/index.js",
    );
    assert.ok(
        uiRegistry
            .listNavbarPlugins()
            .some(
                (plugin) =>
                    plugin.scriptUrl === "/static/gateways/share/ui/navbar.js",
            ),
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
    const adaptersResponse = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/gateways/share/adapters",
    );
    assert.equal(adaptersResponse.statusCode, 200);
    assert.deepEqual(
        adaptersResponse.body.data.map(
            (adapter: { id: string; locked: boolean }) => ({
                id: adapter.id,
                locked: adapter.locked,
            }),
        ),
        [
            { id: "link", locked: true },
            { id: "user", locked: true },
        ],
    );
    assert.equal(
        adaptersResponse.body.data[0].controls.config,
        "/api/v1/gateways/share/adapters/link/config",
    );

    const linkConfigResponse = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/gateways/share/adapters/link/config",
    );
    assert.equal(linkConfigResponse.statusCode, 200);
    assert.deepEqual(linkConfigResponse.body.data, {});

    const invalidCreateExpiryResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            expiresAt: "not-a-timestamp",
        },
    );
    assert.equal(invalidCreateExpiryResponse.statusCode, 400);
    assert.equal(
        invalidCreateExpiryResponse.body.error.code,
        "invalid_expires_at",
    );

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
    assert.equal(
        createResponse.body.data.metadata.resourceName,
        "Project Sync",
    );
    assert.equal(createResponse.body.data.quickShareActions.length, 1);
    assert.equal(createResponse.body.data.quickShareActions[0].id, "smtp");
    assert.equal(createResponse.body.data.variants.length, 2);
    assert.match(createResponse.body.data.variants[1].url, /^\/feeds\//);
    assert.match(
        createResponse.body.data.quickShareActions[0].href,
        /^mailto:/,
    );
    const invalidUpdateExpiryResponse = await dispatchJson(
        "PATCH",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(createResponse.body.data.id)}`,
        { expiresAt: "not-a-timestamp" },
    );
    assert.equal(invalidUpdateExpiryResponse.statusCode, 400);
    assert.equal(
        invalidUpdateExpiryResponse.body.error.code,
        "invalid_expires_at",
    );

    const updateResponse = await dispatchJson(
        "PATCH",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(createResponse.body.data.id)}`,
        {
            label: "Updated Project Sync",
            expiresAt: "",
            accessControls: { permissions: ["read"] },
            grantedCapabilities: ["meeting:join"],
        },
    );
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateResponse.body.data.label, "Updated Project Sync");
    assert.equal(updateResponse.body.data.expiresAt, "");

    const shareEmailResponse = await dispatchJson(
        "POST",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(createResponse.body.data.id)}/email`,
        { recipients: ["guest@example.com", "guest@example.com"] },
    );
    assert.equal(shareEmailResponse.statusCode, 200);
    assert.deepEqual(shareEmailRecipients, ["guest@example.com"]);
    assert.deepEqual(shareEmailVariables, [
        {
            url: createResponse.body.data.shareUrl,
            senderName: "alice",
            resourceName: "Project Sync",
            resourceTypeLabel: "meeting",
        },
    ]);
    const repeatedShareEmailResponse = await dispatchJson(
        "POST",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(createResponse.body.data.id)}/email`,
        { recipients: ["guest@example.com"] },
    );
    assert.equal(repeatedShareEmailResponse.statusCode, 200);
    assert.deepEqual(shareEmailRecipients, [
        "guest@example.com",
        "guest@example.com",
    ]);

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
    const resolvedShare = JSON.parse(resolveResponse.payload).data;
    assert.equal(resolvedShare.resourceType, "meeting");
    assert.match(resolvedShare.guestAccessToken, /^cgs_/);
    assert.match(resolvedShare.guestKeyring.accountId, /^share:[^:]+:[^:]+$/);

    const ownerResolveResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        }),
        ownerResolveResponse,
        new URL(
            `http://localhost/api/v1/share/resolve/${encodeURIComponent(createResponse.body.data.shareUrl.split("/share/")[1])}`,
        ),
    );
    assert.equal(ownerResolveResponse.statusCode, 200);
    const ownerResolvedShare = JSON.parse(ownerResolveResponse.payload).data;
    assert.equal(ownerResolvedShare.directAccess, true);
    assert.equal(ownerResolvedShare.guestAccessToken, "");
    assert.match(resolvedShare.guestKeyring.passphrase, /^[A-Za-z0-9_-]+$/);

    const protectedCreateResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            password: "mail-client-secret",
        },
    );
    const protectedToken = encodeURIComponent(
        protectedCreateResponse.body.data.shareUrl.split("/share/")[1],
    );
    const missingPasswordResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET" }),
        missingPasswordResponse,
        new URL(`http://localhost/api/v1/share/resolve/${protectedToken}`),
    );
    assert.equal(missingPasswordResponse.statusCode, 401);
    assert.equal(
        JSON.parse(missingPasswordResponse.payload).error.code,
        "password_required",
    );
    const basicPassword = Buffer.from(
        "calendar:mail-client-secret",
        "utf8",
    ).toString("base64");
    const basicResolveResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "GET",
            headers: { authorization: `Basic ${basicPassword}` },
        }),
        basicResolveResponse,
        new URL(`http://localhost/api/v1/share/resolve/${protectedToken}`),
    );
    assert.equal(basicResolveResponse.statusCode, 200);

    const externalContentUrlResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            contentUrl: "https://attacker.example/meeting-1",
        },
    );
    assert.equal(externalContentUrlResponse.statusCode, 400);
    assert.equal(
        externalContentUrlResponse.body.error.code,
        "invalid_content_url",
    );

    const restrictedCreateResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            contentUrl: "/meetings?meeting=meeting-1",
            supportsReadOnly: true,
            accessControls: {
                recipients: [{ type: "user", id: "bob" }],
            },
        },
    );
    assert.equal(restrictedCreateResponse.statusCode, 200);
    assert.equal(
        restrictedCreateResponse.body.data.metadata.supportsReadOnly,
        "true",
    );
    const duplicateRestrictedResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join", "meeting:write"],
            accessControls: {
                permissions: ["read", "write"],
                recipients: [{ type: "user", id: "bob" }],
            },
        },
    );
    assert.equal(duplicateRestrictedResponse.statusCode, 409);
    assert.equal(
        duplicateRestrictedResponse.body.error.code,
        "duplicate_user_share",
    );
    const alternateRecipientResponse = await dispatchJson(
        "POST",
        adminToken,
        "/api/v1/share/tokens",
        {
            resourceType: "meeting",
            resourceId: "meeting-1",
            accessControls: {
                recipients: [{ type: "user", id: "charlie" }],
            },
        },
    );
    assert.equal(alternateRecipientResponse.statusCode, 200);
    const duplicateUpdateResponse = await dispatchJson(
        "PATCH",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(alternateRecipientResponse.body.data.id)}`,
        {
            accessControls: {
                recipients: [{ type: "user", id: "bob" }],
            },
        },
    );
    assert.equal(duplicateUpdateResponse.statusCode, 409);
    assert.ok(notificationCategories.includes("share"));
    assert.deepEqual(
        userShareNotifications.map((entry) => entry.recipientUsername),
        ["bob", "charlie"],
    );
    assert.equal(userShareNotifications[0]?.category, "share");
    assert.match(
        String(userShareNotifications[0]?.actionUrl ?? ""),
        /^\/share\//,
    );
    const deleteAlternateResponse = await dispatchJson(
        "DELETE",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(alternateRecipientResponse.body.data.id)}`,
    );
    assert.equal(deleteAlternateResponse.statusCode, 200);
    assert.ok(
        userShareNotifications.some(
            (notification) =>
                notification.recipientUsername === "charlie" &&
                notification.subject === "A shared item was revoked",
        ),
    );
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
    assert.equal(
        JSON.parse(bobRestrictedResponse.payload).data.directAccess,
        true,
    );
    assert.equal(
        JSON.parse(bobRestrictedResponse.payload).data.guestAccessToken,
        "",
    );
    assert.equal(
        JSON.parse(bobRestrictedResponse.payload).data.navigationUrl,
        "/meetings/shared",
    );
    assert.equal(
        JSON.parse(bobRestrictedResponse.payload).data.feedback.messageKey,
        "meeting.share_imported",
    );
    assert.ok(
        deliveredShares.some(
            (delivery) => delivery.recipientAccountId === "bob",
        ),
    );
    assert.equal(typeof deliveredShares[0]?.shareId, "string");
    assert.ok(String(deliveredShares[0]?.shareId ?? "").length > 0);
    assert.equal(deliveredShares.length, 1);

    const restrictedShareId = String(restrictedCreateResponse.body.data.id);
    const overviewResponse = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/share/overview",
    );
    assert.equal(overviewResponse.statusCode, 200);
    assert.equal(overviewResponse.body.data.received[0]?.id, restrictedShareId);
    const addSecondRecipientResponse = await dispatchJson(
        "PATCH",
        adminToken,
        `/api/v1/share/tokens/${encodeURIComponent(restrictedShareId)}`,
        {
            accessControls: {
                recipients: [
                    { type: "user", id: "bob" },
                    { type: "user", id: "diana" },
                ],
            },
        },
    );
    assert.equal(addSecondRecipientResponse.statusCode, 200);
    const rejectionResponse = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/share/tokens/${encodeURIComponent(restrictedShareId)}/reject`,
    );
    assert.equal(rejectionResponse.statusCode, 200);
    assert.equal(rejectionResponse.body.data.rejected, true);
    assert.ok(
        userShareNotifications.some(
            (notification) =>
                notification.recipientUsername === "alice" &&
                notification.subject === "A recipient rejected your share",
        ),
    );
    const removeUserRecipient = capabilities.get<
        (input: {
            shareId: string;
            recipientAccountId: string;
        }) => Promise<"updated" | "deleted" | "not_found">
    >("share:removeUserRecipient");
    const afterRejection = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/share/tokens?resourceType=meeting&resourceId=meeting-1",
    );
    const remainingShare = afterRejection.body.data.find(
        (share: { id?: string }) => share.id === restrictedShareId,
    );
    assert.equal(remainingShare.accessControls.recipients.length, 1);
    assert.equal(remainingShare.accessControls.recipients[0].id, "diana");
    assert.equal(
        await removeUserRecipient?.({
            shareId: restrictedShareId,
            recipientAccountId: "diana",
        }),
        "deleted",
    );
    const afterLastRecipientLeaves = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/share/tokens?resourceType=meeting&resourceId=meeting-1",
    );
    assert.equal(
        afterLastRecipientLeaves.body.data.some(
            (share: { id?: string }) => share.id === restrictedShareId,
        ),
        false,
    );
    const deleteResourceShares = capabilities.get<
        (input: {
            ownerAccountId: string;
            resourceType: string;
            resourceId: string;
        }) => Promise<number>
    >("share:deleteResourceShares");
    const deletedResourceShareCount = await deleteResourceShares?.({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.ok((deletedResourceShareCount ?? 0) > 0);
    const afterResourceDeletion = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/share/tokens?resourceType=meeting&resourceId=meeting-1",
    );
    assert.equal(afterResourceDeletion.body.data.length, 0);
});
