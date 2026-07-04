import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { createGatewayUiRegistryHooks } from "../../reuse/ui-registry-hooks.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { GatewayBootstrapContext } from "../shared.js";
import { DbCalendarStore } from "../store.js";
import { normalizeCalendarColor } from "../color.js";
import {
    CoreCalendarGateway,
    type CalendarVisibility,
} from "../gateway/index.js";
import { createCalendarAdapterRoutes } from "./adapter-routes.js";
import { createCalendarCoreRoutes } from "./calendar-routes.js";
import type { ResolveAccountId } from "./helpers.js";
import { createCalendarNotificationResolver } from "./notification-capabilities.js";
import { CalendarShareRegistry } from "./share-registry.js";

const GATEWAY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const gateway = new CoreCalendarGateway();
    const notificationResolver = createCalendarNotificationResolver(
        ctx.capabilities,
    );
    const adaptersRoot = path.join(ctx.adaptersRoot, "calendar");
    const dbExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    const resolveMeetingsProviderAvailability = systemCtx?.getCapability<
        (providerId: string) => Promise<boolean> | boolean
    >("meetings:isProviderAvailable");
    const resolveAccountId = ctx.capabilities.get<ResolveAccountId>(
        "auth:resolveAccountId",
    );
    const profileStore = ctx.capabilities.get<{
        searchProfiles: (
            query: string,
            limit?: number,
            options?: { includeHidden?: boolean },
        ) => Promise<
            Array<{
                accountId: string;
                handle?: string | null;
                displayName?: string | null;
                avatarKey?: string | null;
            }>
        >;
        isFollowing: (
            followerId: string,
            followingId: string,
        ) => Promise<boolean>;
    }>("social:profileStore");

    const resolveShareableUsers = profileStore
        ? async (input: { ownerAccountId: string; query: string }) => {
              const normalizedQuery = input.query.trim();
              if (!normalizedQuery) return [];
              const candidates = await profileStore.searchProfiles(
                  normalizedQuery,
                  25,
                  { includeHidden: false },
              );
              const permittedCandidates = await Promise.all(
                  candidates
                      .filter(
                          (entry) =>
                              String(entry.accountId ?? "") !==
                              input.ownerAccountId,
                      )
                      .map(async (entry) => {
                          const targetAccountId = String(
                              entry.accountId ?? "",
                          ).trim();
                          if (!targetAccountId) return null;
                          const [followsTarget, targetFollows] =
                              await Promise.all([
                                  profileStore.isFollowing(
                                      input.ownerAccountId,
                                      targetAccountId,
                                  ),
                                  profileStore.isFollowing(
                                      targetAccountId,
                                      input.ownerAccountId,
                                  ),
                              ]);
                          if (!followsTarget && !targetFollows) return null;
                          return {
                              accountId: targetAccountId,
                              handle:
                                  typeof entry.handle === "string"
                                      ? entry.handle
                                      : null,
                              displayName:
                                  typeof entry.displayName === "string"
                                      ? entry.displayName
                                      : null,
                              avatarKey:
                                  typeof entry.avatarKey === "string"
                                      ? entry.avatarKey
                                      : null,
                          };
                      }),
              );
              return permittedCandidates.filter(Boolean) as Array<{
                  accountId: string;
                  handle: string | null;
                  displayName: string | null;
                  avatarKey: string | null;
              }>;
          }
        : null;

    if (dbExecutor) {
        try {
            const store = new DbCalendarStore(dbExecutor);
            await store.ensureSchema();
            await gateway.attachStore(store);
        } catch (error) {
            ctx.log?.("error", "Calendar DB store initialization failed.", {
                component: "calendar-gateway",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    const shareRegistry = new CalendarShareRegistry(
        dbExecutor ?? null,
        ctx.log,
    );
    await shareRegistry.ensureSchema();
    ctx.capabilities.contribute("calendar:resolveShareLink", (token: string) =>
        shareRegistry.resolveShareLink(token),
    );

    await gateway.discoverAdapters(adaptersRoot);

    ctx.capabilities.contribute(
        "calendar:createCalendar",
        (
            ownerAccountId: string,
            name: string,
            visibility?: CalendarVisibility,
            color?: string,
            defaultReminderOffsetsMinutes?: number[],
        ) =>
            gateway.createCalendar({
                ownerAccountId,
                name,
                visibility,
                color: normalizeCalendarColor(color),
                defaultReminderOffsetsMinutes,
            }),
    );
    ctx.capabilities.contribute(
        "calendar:listCalendars",
        (ownerAccountId: string) => gateway.listCalendars(ownerAccountId),
    );
    ctx.capabilities.contribute(
        "calendar:deleteCalendar",
        (ownerAccountId: string, calendarId: string) =>
            gateway.deleteCalendar({ ownerAccountId, calendarId }),
    );
    ctx.capabilities.contribute(
        "calendar:updateCalendar",
        (input: {
            ownerAccountId: string;
            calendarId: string;
            name?: string;
            visibility?: CalendarVisibility;
            color?: string;
            defaultReminderOffsetsMinutes?: number[];
        }) =>
            gateway.updateCalendar({
                ownerAccountId: input.ownerAccountId,
                calendarId: input.calendarId,
                name: input.name,
                visibility: input.visibility,
                color:
                    input.color == null
                        ? undefined
                        : normalizeCalendarColor(input.color),
                defaultReminderOffsetsMinutes:
                    input.defaultReminderOffsetsMinutes,
            }),
    );
    ctx.capabilities.contribute(
        "calendar:addEvent",
        (input: {
            ownerAccountId: string;
            calendarId: string;
            title: string;
            description?: string | null;
            startAt: string;
            endAt: string;
            attendees?: string[];
            inviteEmails?: string[];
            reminderOffsetsMinutes?: number[];
            meetingUrl?: string | null;
            status?: "busy" | "free";
            recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
        }) => gateway.addEvent(input),
    );
    ctx.capabilities.contribute("calendar:listEvents", (calendarId: string) =>
        gateway.listEvents(calendarId),
    );
    ctx.capabilities.contribute(
        "calendar:listSharedUsers",
        async (input: { ownerAccountId: string; calendarId: string }) =>
            (
                await shareRegistry.listCalendarUserShares(
                    input.ownerAccountId,
                    input.calendarId,
                )
            ).map((share) => ({
                recipientAccountId: share.recipientAccountId,
            })),
    );
    ctx.capabilities.contribute(
        "calendar:shareCalendarWithUser",
        async (input: {
            ownerAccountId: string;
            calendarId: string;
            recipientAccountId: string;
            recipientHandle?: string | null;
            recipientDisplayName?: string | null;
            recipientAvatarKey?: string | null;
            permission?: "read" | "write";
        }) => {
            const ownerCalendar = gateway.getOwnedCalendar(
                input.ownerAccountId,
                input.calendarId,
            );
            if (!ownerCalendar) {
                throw new Error("calendar_not_found");
            }
            if (input.recipientAccountId === input.ownerAccountId) {
                return;
            }
            let recipientCalendarId = (
                await shareRegistry.listCalendarUserShares(
                    input.ownerAccountId,
                    input.calendarId,
                )
            ).find(
                (share) =>
                    share.recipientAccountId === input.recipientAccountId,
            )?.recipientCalendarId;
            if (!recipientCalendarId) {
                recipientCalendarId = gateway.createCalendar({
                    ownerAccountId: input.recipientAccountId,
                    name: `${ownerCalendar.name} (Shared by ${input.ownerAccountId})`,
                    visibility: "shared",
                    color: normalizeCalendarColor(ownerCalendar.color),
                }).id;
            }
            await shareRegistry.upsertCalendarUserShare({
                ownerAccountId: input.ownerAccountId,
                ownerCalendarId: input.calendarId,
                recipientAccountId: input.recipientAccountId,
                recipientCalendarId,
                recipientHandle:
                    typeof input.recipientHandle === "string"
                        ? input.recipientHandle
                        : null,
                recipientDisplayName:
                    typeof input.recipientDisplayName === "string"
                        ? input.recipientDisplayName
                        : null,
                recipientAvatarKey:
                    typeof input.recipientAvatarKey === "string"
                        ? input.recipientAvatarKey
                        : null,
                permission: input.permission === "write" ? "write" : "read",
            });
        },
    );
    ctx.capabilities.contribute(
        "calendar:removeCalendarShareForUser",
        async (input: {
            ownerAccountId: string;
            calendarId: string;
            recipientAccountId: string;
        }) => {
            const shares = await shareRegistry.listCalendarUserShares(
                input.ownerAccountId,
                input.calendarId,
            );
            const share = shares.find(
                (entry) =>
                    entry.recipientAccountId === input.recipientAccountId,
            );
            if (!share) return;
            await shareRegistry.deleteCalendarUserShare({
                ownerAccountId: input.ownerAccountId,
                ownerCalendarId: input.calendarId,
                shareId: share.id,
            });
            const recipientCalendar = gateway.getOwnedCalendar(
                share.recipientAccountId,
                share.recipientCalendarId,
            );
            if (recipientCalendar?.visibility === "shared") {
                gateway.deleteCalendar({
                    ownerAccountId: share.recipientAccountId,
                    calendarId: share.recipientCalendarId,
                });
                await gateway.flushStore();
            }
        },
    );
    ctx.capabilities.contribute("calendar:exportIcs", (calendarId: string) =>
        gateway.exportCalendarAsIcs(calendarId),
    );
    ctx.capabilities.contribute(
        "calendar:importIcs",
        (input: { ownerAccountId: string; calendarId: string; ics: string }) =>
            gateway.importIcs(input),
    );

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "calendar"),
        log: ctx.log,
        isGatewayEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.routeRegistry.register(
        createCalendarCoreRoutes({
            gateway,
            shareRegistry,
            routeContext,
            resolveMeetingsProviderAvailability:
                resolveMeetingsProviderAvailability ?? null,
            resolveShareableUsers,
            resolveAccountId: resolveAccountId ?? null,
            log: ctx.log,
            getDispatchNotification: () =>
                notificationResolver.getDispatchNotification(),
            ensureNotificationCategory: () =>
                notificationResolver.ensureCategory(),
        }),
        "calendar",
    );

    const serveCalendarHtml = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET" || url.pathname !== "/calendar") return false;
        if (!routeHelpers.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        routeHelpers.setPageSecurityHeaders(res);
        const html = await readFile(
            path.join(GATEWAY_ROOT, "ui", "index.html"),
            "utf8",
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };

    ctx.routeRegistry.register(serveCalendarHtml, "calendar");
    ctx.routeRegistry.register(
        createCalendarAdapterRoutes(
            "calendar",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "calendar",
    );

    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "calendar");
    uiHooks.registerStaticDir("calendar", GATEWAY_ROOT);
    uiHooks.registerNavbarPlugin(
        "/static/gateways/calendar/ui/navbar.js",
        () => ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    );
    uiHooks.registerSpaRoute({
        id: "calendar-page",
        pattern: "^/calendar$",
        base: "/calendar",
        scriptUrl: "/static/gateways/calendar/ui/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/calendar/ui/calendar.css",
        ],
        isEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.routeRegistry.registerPrefix("/api/v1/calendar", "calendar");
    ctx.gatewayRegistry.register({
        id: "calendar",
        name: "Calendar Gateway",
        version: "1.2.0",
        description:
            "Internal calendar management with pluggable CalDAV and ICS adapters.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });

    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "calendar-gateway:bootstrap-registration" },
            () => ({ gatewayId: "calendar", registeredFlowIds: [] }),
        );
    }
}
