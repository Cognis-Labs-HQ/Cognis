import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import { createGatewayUiRegistryHooks } from "../../reuse/ui-registry-hooks.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { ShareTokenStore } from "../gateway/store.js";
import { GuestProfileStore } from "../gateway/guest-profile-store.js";
import { ShareApprovalRequestStore } from "../gateway/approval-request-store.js";
import { CoreShareGateway } from "../gateway/index.js";
import { registerShareBootstrapHooks } from "./flow-registrations.js";
import { createShareRoutes } from "./routes.js";
import {
    hasShareCapability,
    resolveShareGuestAccess,
    resolveShareGuestId,
    resolveShareGuestSessionId,
} from "../reuse/share-guest.js";

const GATEWAY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const SHARE_ADAPTERS_ROOT = path.resolve(GATEWAY_ROOT, "../../adapters/share");

const GUEST_PROFILE_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    if (!dbExecutor) {
        return;
    }
    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>("auth:routeContext"),
    );
    const store = new ShareTokenStore(dbExecutor, ctx.log);
    const guestProfileStore = new GuestProfileStore(dbExecutor);
    const approvalRequestStore = new ShareApprovalRequestStore(dbExecutor);
    const gateway = new CoreShareGateway(
        store,
        guestProfileStore,
        approvalRequestStore,
        undefined,
        ctx.capabilities.get.bind(ctx.capabilities),
    );
    const registerEmailTemplate = ctx.capabilities.get<
        (
            templateId: string,
            template: (variables: Record<string, string>) => {
                subject: string;
                body: string;
                senderName: string;
                actionUrl: string;
                actionLabel: string;
            },
        ) => boolean
    >("notify:registerEmailTemplate");
    ctx.capabilities.get<(id: string, label: string) => void>(
        "notify:registerCategory",
    )?.("share", "Share");
    const dispatchNotification =
        ctx.capabilities.get<
            (notification: Record<string, unknown>) => Promise<unknown>
        >("notify:dispatch");
    const notifyExpiredShares = async (): Promise<void> => {
        if (!dispatchNotification) return;
        const expiredShares = await gateway.claimExpiredNotifications();
        for (const share of expiredShares) {
            const accountIds = new Set([
                share.ownerAccountId,
                ...share.accessControls.recipients
                    .filter((recipient) => recipient.type === "user")
                    .map((recipient) => recipient.id),
            ]);
            await Promise.allSettled(
                Array.from(accountIds).map((accountId) =>
                    dispatchNotification({
                        category: "share",
                        recipientUsername: accountId,
                        subject: "A share expired",
                        body: `${share.label || "A shared item"} has expired.`,
                        actionUrl: "/shares",
                        senderName: "Cognis Share",
                        metadata: { shareId: share.id },
                    }),
                ),
            );
        }
    };
    registerEmailTemplate?.("share-link", (variables) => ({
        subject: `${variables.senderName} shared ${variables.resourceName} with you`,
        body: `${variables.senderName} shared the ${variables.resourceTypeLabel} “${variables.resourceName}” with you.\n\nOpen the shared item:\n${variables.url}`,
        senderName: "Cognis Share",
        actionUrl: variables.url,
        actionLabel: "Open Shared Item",
    }));
    await gateway.ensureSchema();
    await gateway.discoverAdapters(SHARE_ADAPTERS_ROOT);

    ctx.capabilities.contribute(
        "share:mintToken",
        gateway.issueToken.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:listTokens",
        gateway.listTokens.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:listByResource",
        gateway.listByResource.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:resolveUserAccess",
        gateway.resolveUserAccess.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:deleteToken",
        gateway.deleteToken.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:removeUserRecipient",
        async (input: { shareId: string; recipientAccountId: string }) => {
            const result = await gateway.removeUserRecipient(input);
            ctx.log?.("info", "Removed recipient from user share.", {
                component: "share-gateway",
                operation: "remove_user_recipient",
                shareId: input.shareId,
                recipientAccountId: input.recipientAccountId,
                result,
            });
            return result;
        },
    );
    ctx.capabilities.contribute(
        "share:deleteResourceShares",
        async (input: {
            ownerAccountId: string;
            resourceType: string;
            resourceId: string;
        }) => {
            const deletedCount = await gateway.deleteResourceShares(input);
            ctx.log?.("info", "Deleted shares for removed resource.", {
                component: "share-gateway",
                operation: "delete_resource_shares",
                ...input,
                deletedCount,
            });
            return deletedCount;
        },
    );
    ctx.capabilities.contribute(
        "share:updateToken",
        gateway.updateToken.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:resolveToken",
        gateway.resolveToken.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:inspectToken",
        gateway.inspectToken.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:getTokenById",
        gateway.getTokenById.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:getGuestProfile",
        gateway.getGuestProfile.bind(gateway),
    );
    ctx.capabilities.contribute(
        "share:buildAbsoluteUrl",
        gateway.buildAbsoluteUrl.bind(gateway),
    );

    ctx.capabilities.contribute("share:resolveGuestId", resolveShareGuestId);
    ctx.capabilities.contribute(
        "share:resolveGuestSessionId",
        resolveShareGuestSessionId,
    );
    ctx.capabilities.contribute("share:hasCapability", hasShareCapability);
    ctx.capabilities.contribute("share:resolveGuestAccess", (options) =>
        resolveShareGuestAccess({
            ...options,
            getTokenById: gateway.getTokenById.bind(gateway),
            getGuestProfile: gateway.getGuestProfile.bind(gateway),
        }),
    );
    ctx.capabilities.contribute(
        "share:listPendingApprovalsForAccount",
        gateway.listPendingApprovalsForAccount.bind(gateway),
    );

    await registerShareBootstrapHooks({ ctx, gateway });

    ctx.routeRegistry.register(
        createShareRoutes({
            gateway,
            routeContext,
            uiRoot: path.join(GATEWAY_ROOT, "ui"),
            flow: ctx.flow,
            log: ctx.log,
        }),
        "share",
    );

    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "share");
    uiHooks.registerStaticDir("share", GATEWAY_ROOT);
    uiHooks.registerSpaRoute({
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
    });
    uiHooks.registerSpaRoute({
        id: "shares-page",
        pattern: "^/shares$",
        base: "/shares",
        scriptUrl: "/static/gateways/share/ui/app/shares/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/share/ui/app/shares/index.css",
        ],
        access: { minRole: "user" },
    });
    for (const adapter of gateway.listAdapters()) {
        uiHooks.registerAdapterStaticDir(
            adapter.id,
            path.join(SHARE_ADAPTERS_ROOT, adapter.id),
        );
    }
    uiHooks.registerNavbarPlugin(
        "/static/gateways/share/ui/approval-poller.js",
    );
    uiHooks.registerNavbarPlugin(
        "/static/gateways/share/ui/received-share-action.js",
    );
    uiHooks.registerNavbarPlugin("/static/gateways/share/ui/navbar.js");
    uiHooks.registerNavbarPlugin(
        "/static/adapters/share/link/ui/share-links-popup/index.js",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/share", "share");
    ctx.gatewayRegistry.register({
        id: "share",
        name: "Share Gateway",
        version: "1.6.57",
        description: "Public share token orchestration for Cognis resources.",
        publisher: "Cognis Labs HQ",
    });

    const cleanupTimer = setInterval(() => {
        void notifyExpiredShares().catch((error) => {
            ctx.log?.("error", "Failed to notify expired shares.", {
                component: "share-gateway",
                operation: "notify_expired_shares",
                error: error instanceof Error ? error.message : String(error),
            });
        });
        void gateway.purgeExpiredShareTokens().catch((error) => {
            ctx.log?.("error", "Failed to purge expired share tokens.", {
                component: "share-gateway",
                operation: "purge_expired_share_tokens",
                error: error instanceof Error ? error.message : String(error),
            });
        });
        void gateway.purgeExpiredGuestProfiles().catch((error) => {
            ctx.log?.("error", "Failed to purge expired guest profiles.", {
                component: "share-gateway",
                operation: "purge_expired_guest_profiles",
                error: error instanceof Error ? error.message : String(error),
            });
        });
        void gateway.purgeExpiredApprovalRequests().catch((error) => {
            ctx.log?.(
                "error",
                "Failed to purge expired share approval requests.",
                {
                    component: "share-gateway",
                    operation: "purge_expired_approval_requests",
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        });
    }, GUEST_PROFILE_CLEANUP_INTERVAL_MS);
    cleanupTimer.unref?.();
    void notifyExpiredShares().catch((error) => {
        ctx.log?.("error", "Failed initial expired share notification scan.", {
            component: "share-gateway",
            operation: "notify_expired_shares_initial",
            error: error instanceof Error ? error.message : String(error),
        });
    });
}
