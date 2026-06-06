import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import { readJson } from "../../api/reuse/read-json.js";
import { buildGatewayAdapterAdminControls } from "../../api/reuse/adapter-admin-controls.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { DbAdapterConfigStore } from "./adapter-config-store.js";
import { CoreSocialGateway } from "./gateway.js";
import { createGatewayUiRegistryHooks } from "../reuse/ui-registry-hooks.js";
import {
    MESSAGING_FLOW_CATALOG,
    PROFILE_MEDIA_FLOW_CATALOG,
    CTX_CAPABILITY,
    registerCanonicalFlow,
} from "@cognis/core";
import type { Ctx } from "@cognis/core";

const PRESENCE_STALE_MS = 120_000;
const PRESENCE_AWAY_MS = 45_000;

type PresenceState = "online" | "away" | "offline";

class PresenceTracker {
    private readonly entries = new Map<
        string,
        { status: Exclude<PresenceState, "offline">; lastSeenAt: number }
    >();
    private readonly subscribers = new Set<ServerResponse>();

    setStatus(accountId: string, status: PresenceState): PresenceState {
        const normalizedAccountId = String(accountId ?? "").trim();
        if (!normalizedAccountId) return "offline";
        if (status === "offline") {
            this.entries.delete(normalizedAccountId);
            this.broadcast({
                accountId: normalizedAccountId,
                status: "offline",
            });
            return "offline";
        }
        const now = Date.now();
        this.entries.set(normalizedAccountId, {
            status: status === "away" ? "away" : "online",
            lastSeenAt: now,
        });
        this.broadcast({
            accountId: normalizedAccountId,
            status,
        });
        return status;
    }

    getStatus(accountId: string): PresenceState {
        const normalizedAccountId = String(accountId ?? "").trim();
        if (!normalizedAccountId) return "offline";
        const entry = this.entries.get(normalizedAccountId);
        if (!entry) return "offline";
        const age = Date.now() - entry.lastSeenAt;
        if (age >= PRESENCE_STALE_MS) {
            this.entries.delete(normalizedAccountId);
            return "offline";
        }
        if (entry.status === "away" || age >= PRESENCE_AWAY_MS) {
            return "away";
        }
        return "online";
    }

    getStatuses(accountIds: string[]): Record<string, PresenceState> {
        const statuses: Record<string, PresenceState> = {};
        for (const accountId of accountIds) {
            const normalizedAccountId = String(accountId ?? "").trim();
            if (!normalizedAccountId) continue;
            statuses[normalizedAccountId] = this.getStatus(normalizedAccountId);
        }
        return statuses;
    }

    subscribe(res: ServerResponse): void {
        this.subscribers.add(res);
    }

    unsubscribe(res: ServerResponse): void {
        this.subscribers.delete(res);
    }

    pruneAndBroadcast(): void {
        const updates: Array<{ accountId: string; status: PresenceState }> = [];
        for (const [accountId] of this.entries) {
            const status = this.getStatus(accountId);
            if (status === "offline") {
                updates.push({ accountId, status });
            }
        }
        for (const update of updates) {
            this.broadcast(update);
        }
    }

    private broadcast(payload: {
        accountId: string;
        status: PresenceState;
    }): void {
        const eventPayload = `event: presence\ndata: ${JSON.stringify(payload)}\n\n`;
        for (const subscriber of this.subscribers) {
            try {
                subscriber.write(eventPayload);
            } catch {
                this.subscribers.delete(subscriber);
            }
        }
    }
}

function normalizePresenceState(value: unknown): PresenceState {
    const normalizedValue = String(value ?? "")
        .trim()
        .toLowerCase();
    if (normalizedValue === "away") return "away";
    if (normalizedValue === "offline") return "offline";
    return "online";
}

function createSocialPresenceRoutes(
    routeContext: RouteContext | undefined,
    tracker: PresenceTracker,
) {
    const ctx = resolveRouteContext(routeContext);
    const resolvePresenceClaims = (
        req: IncomingMessage,
        res: ServerResponse,
    ): { sub: string; role: string } | null => {
        const directClaims = ctx.getAuthClaims(req);
        if (directClaims) return directClaims;
        const reqUrl = new URL(req.url ?? "/", "http://localhost");
        const streamToken = String(reqUrl.searchParams.get("token") ?? "").trim();
        if (!streamToken) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "unauthorized", message: "Login required" },
                }),
            );
            return null;
        }
        const tokenClaims = ctx.lookupAccessToken(streamToken);
        if (!tokenClaims || tokenClaims.revoked) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "unauthorized", message: "Login required" },
                }),
            );
            return null;
        }
        return { sub: tokenClaims.sub, role: tokenClaims.role };
    };
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/social/presence" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as { status?: unknown };
            const status = normalizePresenceState(body?.status);
            const nextStatus = tracker.setStatus(claims.sub, status);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { accountId: claims.sub, status: nextStatus },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/social/presence" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const accountIds = String(url.searchParams.get("accountIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean);
            const normalizedAccountIds = Array.from(
                new Set(accountIds.length ? accountIds : [claims.sub]),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: tracker.getStatuses(normalizedAccountIds),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/social/presence/stream" &&
            req.method === "GET"
        ) {
            const claims = resolvePresenceClaims(req, res);
            if (!claims) return true;
            res.writeHead(200, {
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                connection: "keep-alive",
            });
            res.write(`event: ready\ndata: {"accountId":"${claims.sub}"}\n\n`);
            tracker.subscribe(res);
            req.on("close", () => {
                tracker.unsubscribe(res);
            });
            return true;
        }
        return false;
    };
}

export type { SocialAdapterBootstrapCtx, SocialAdapter } from "./gateway.js";
export {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "./reuse/profile-record.js";

/**
 * Route handler for social adapter management. Mirrors the notification
 * gateway adapter controls so Administration sliders persist state and disabled
 * adapters stop serving routes immediately.
 */
function createSocialAdapterRoutes(
    gatewayId: string,
    gateway: CoreSocialGateway,
    gatewayRegistry: GatewayBootstrapContext["gatewayRegistry"],
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: gateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            adapter.id,
                        ),
                    })),
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                const config = gateway.getAdapterConfig(adapterId);
                if (config === null) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues: {},
                        requiredFields: [],
                        supportsTest: false,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!gateway.getAdapter(adapterId)) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                const body = await readJson(req);
                await gateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                const gwEntry = gatewayRegistry.get(gatewayId);
                if (gwEntry?.status === "disabled") {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "gateway_disabled",
                                message:
                                    "Cannot enable an adapter while its gateway is disabled",
                            },
                        }),
                    );
                    return true;
                }
            }
            if (action === "enable") {
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enabled: action === "enable" } }));
            return true;
        }

        return false;
    };
}

/**
 * Standard gateway bootstrap entry point for the Social Gateway.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");
    const configStore = new DbAdapterConfigStore(dbExecutor);
    await configStore.ensureSchema();

    const gateway = new CoreSocialGateway(configStore);
    const presenceTracker = new PresenceTracker();
    const adaptersRoot = path.join(ctx.adaptersRoot, "social");

    await gateway.discoverAdapters(adaptersRoot);
    await gateway.loadPersistedConfigs();
    ctx.log?.("info", "Social gateway: adapters discovered and configured.", {
        component: "social-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    await gateway.bootstrapAdapters(adaptersRoot, {
        ...createGatewayUiRegistryHooks(ctx.uiRegistry, "social"),
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        flow: ctx.flow,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "social"),
        registerAdapterStaticDir: (gatewayId, adapterId, absoluteDir) =>
            ctx.uiRegistry?.registerAdapterStaticDir(
                gatewayId,
                adapterId,
                absoluteDir,
            ),
        registerAuthTypingMessage: (message) =>
            ctx.uiRegistry?.registerAuthTypingMessage(message),
        log: ctx.log,
        isGatewayEnabled: () =>
            ctx.gatewayRegistry.get("social")?.status !== "disabled",
    });

    ctx.log?.("info", "Social gateway: adapters bootstrapped.", {
        component: "social-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    ctx.routeRegistry.register(
        createSocialPresenceRoutes(routeContext, presenceTracker),
        "social",
    );

    ctx.capabilities.contribute(
        "social:presence:getStatuses",
        async (accountIds: string[]): Promise<Record<string, PresenceState>> =>
            presenceTracker.getStatuses(accountIds),
    );

    setInterval(() => {
        presenceTracker.pruneAndBroadcast();
    }, 15_000).unref?.();

    ctx.routeRegistry.register(
        createSocialAdapterRoutes(
            "social",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "social",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/social", "social");
    ctx.gatewayRegistry.register({
        id: "social",
        name: "Social Gateway",
        version: "1.2.7",
        description: "Profiles, social graph, posts, and messaging.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "social",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("social", uiDir);

    ctx.log?.("info", "Social gateway: initialized.", {
        component: "social-gateway",
        adaptersRoot,
    });

    const systemCtx = ctx.capabilities.get<Ctx>(CTX_CAPABILITY)!;
    for (const flow of MESSAGING_FLOW_CATALOG) {
        registerCanonicalFlow(systemCtx, flow);
    }
    for (const flow of PROFILE_MEDIA_FLOW_CATALOG) {
        registerCanonicalFlow(systemCtx, flow);
    }

    ctx.flow.extend(
        "construct-messaging-ui",
        "resolve-navigation",
        { id: "social-gateway:resolve-navigation" },
        () => {
            const uiResources = ctx.capabilities.get<{
                languageBaseUrls?: string[];
                stylesheetUrls?: string[];
            }>("social:messages:uiResources");
            return {
                navEntry: {
                    id: "messages",
                    label: "module.social.messages.nav_title",
                    url: "/messages",
                    iconUrl: "/static/gateways/social/assets/messages-icon.svg",
                    stylesheetUrls: uiResources?.stylesheetUrls ?? [],
                    languageBaseUrls: uiResources?.languageBaseUrls ?? [],
                },
            };
        },
    );

    ctx.flow.extend(
        "construct-messaging-ui",
        "compose-surface",
        { id: "social-gateway:compose-surface" },
        (stageCtx) => {
            const navResults = (stageCtx.stageResults["resolve-navigation"] ??
                []) as Array<{ navEntry?: unknown }>;
            return {
                surface: "messages",
                navEntries: navResults.map((r) => r.navEntry).filter(Boolean),
            };
        },
    );

    ctx.flow.extend(
        "send-message",
        "validate-message",
        { id: "social-gateway:validate-message" },
        (stageCtx) => {
            const input = stageCtx.input;
            const roomId = String(
                (input as Record<string, unknown>).roomId ?? "",
            );
            const ciphertext = String(
                (input as Record<string, unknown>).ciphertext ?? "",
            );
            const iv = String((input as Record<string, unknown>).iv ?? "");
            if (!roomId) {
                return { valid: false, reason: "missing_room_id" };
            }
            if (!ciphertext || !iv) {
                return {
                    valid: false,
                    reason: "missing_ciphertext_or_iv",
                };
            }
            return { valid: true, roomId, ciphertext, iv };
        },
    );

    ctx.flow.extend(
        "send-message",
        "fan-out",
        { id: "social-gateway:fan-out" },
        (stageCtx) => {
            const persistResults = (stageCtx.stageResults["persist-message"] ??
                []) as Array<{ messageId?: string; persisted?: boolean }>;
            const messageId = persistResults[0]?.messageId;
            return { fanOut: Boolean(messageId), messageId };
        },
    );

    ctx.flow.extend(
        "upload-profile-media",
        "validate-upload",
        { id: "social-gateway:validate-profile-media-upload" },
        (stageCtx) => {
            const input = stageCtx.input as Record<string, unknown>;
            const mediaField = String(input.mediaField ?? "");
            if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                return { valid: false, reason: "invalid_media_field" };
            }
            const accountId = String(input.accountId ?? "");
            if (!accountId) {
                return { valid: false, reason: "missing_account_id" };
            }
            return { valid: true, mediaField, accountId };
        },
    );

    ctx.flow.extend(
        "remove-profile-media",
        "validate-removal",
        { id: "social-gateway:validate-profile-media-removal" },
        (stageCtx) => {
            const input = stageCtx.input as Record<string, unknown>;
            const mediaField = String(input.mediaField ?? "");
            if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                return { valid: false, reason: "invalid_media_field" };
            }
            const accountId = String(input.accountId ?? "");
            if (!accountId) {
                return { valid: false, reason: "missing_account_id" };
            }
            return { valid: true, mediaField, accountId };
        },
    );
}
