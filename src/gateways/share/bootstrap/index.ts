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
        "share:deleteToken",
        gateway.deleteToken.bind(gateway),
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
    for (const adapter of gateway.listAdapters()) {
        uiHooks.registerAdapterStaticDir(
            adapter.id,
            path.join(SHARE_ADAPTERS_ROOT, adapter.id),
        );
    }
    uiHooks.registerNavbarPlugin(
        "/static/gateways/share/ui/approval-poller.js",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/share", "share");
    ctx.gatewayRegistry.register({
        id: "share",
        name: "Share Gateway",
        version: "1.5.2",
        description: "Public share token orchestration for Cognis resources.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });

    const cleanupTimer = setInterval(() => {
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
}
