import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
    type Ctx,
} from "@cognis/core";
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
    if (systemCtx && !systemCtx.hasFlow("calendar-upcoming-events")) {
        systemCtx.registerFlow({
            id: "calendar-upcoming-events",
            stages: ["project-events"],
        });
    }
    systemCtx?.flow.extend(
        "calendar-upcoming-events",
        "project-events",
        { id: "calendar-gateway:project-upcoming-events" },
        (stageCtx) => {
            const input = stageCtx.input as {
                accountId: string;
                limit?: number;
            };
            return gateway.listUpcomingEvents(input.accountId, input.limit);
        },
    );
    // Calendar currently bootstraps before Share. Registering the shared flow
    // contracts here makes the facilitator hooks below independent of gateway
    // discovery order; Share's later registration is intentionally idempotent.
    if (systemCtx) {
        for (const flow of SHARE_FLOW_CATALOG) {
            registerCanonicalFlow(systemCtx, flow);
        }
    }
    const resolveMeetingsProviderAvailability = systemCtx?.getCapability<
        (providerId: string) => Promise<boolean> | boolean
    >("meetings:isProviderAvailable");
    const resolveAccountId = ctx.capabilities.get<ResolveAccountId>(
        "auth:resolveAccountId",
    );
    const profileStore = ctx.capabilities.get<{
        getProfile?: (accountId: string) => Promise<{
            displayName?: string | null;
            handle?: string | null;
        } | null>;
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

    const resolveAccountDisplayName = profileStore?.getProfile
        ? async (accountId: string) => {
              const profile = await profileStore.getProfile?.(accountId);
              return (
                  String(
                      profile?.displayName ?? profile?.handle ?? "",
                  ).trim() || accountId
              );
          }
        : null;

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
            const deleteAccountActivity = async (accountId: string) => {
                await gateway.deleteAccountActivity(accountId);
                ctx.log?.("info", "Deleted user calendar activity.", {
                    component: "calendar-gateway",
                    operation: "delete_user_activity",
                    accountId,
                });
            };
            ctx.capabilities.get<
                (
                    ownerId: string,
                    purge: (accountId: string) => Promise<void>,
                ) => void
            >("auth:registerAccountDataOwner")?.(
                "calendar",
                deleteAccountActivity,
            );
            ctx.flow.extend(
                "deprovision-user",
                "cleanup-dependencies",
                { id: "calendar-gateway:delete-user-activity" },
                async (stageCtx) => {
                    const input = (stageCtx.input ?? {}) as {
                        username?: string;
                        action?: string;
                    };
                    const persistResult = (stageCtx.stageResults[
                        "persist-state"
                    ] ?? []) as Array<{ persisted?: boolean }>;
                    if (
                        input.action !== "delete" ||
                        !input.username ||
                        !persistResult[0]?.persisted
                    ) {
                        return { cleaned: false };
                    }
                    const accountId = input.username.trim().toLowerCase();
                    await deleteAccountActivity(accountId);
                    return { cleaned: true, accountId };
                },
            );
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
    ctx.capabilities.get<
        (ownerId: string, purge: (accountId: string) => Promise<void>) => void
    >("auth:registerKeyringDataOwner")?.(
        "calendar-shares",
        async (accountId) => {
            const shares =
                await shareRegistry.listCalendarUserSharesByRecipient(
                    accountId,
                );
            for (const share of shares) {
                await shareRegistry.deleteCalendarUserShareById(share.id);
                const calendar = gateway.getOwnedCalendar(
                    accountId,
                    share.recipientCalendarId,
                );
                if (calendar?.visibility === "shared") {
                    gateway.deleteCalendar({
                        ownerAccountId: accountId,
                        calendarId: share.recipientCalendarId,
                    });
                }
            }
            await gateway.flushStore();
        },
    );
    const shareExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const removeDeliveredCalendarShare = async (shareId: string) => {
        const shares =
            await shareRegistry.listCalendarUserSharesByTokenId(shareId);
        if (shares.length === 0) return false;
        await shareRegistry.deleteCalendarUserSharesByTokenId(shareId);
        for (const share of shares) {
            const recipientCalendar = gateway.getOwnedCalendar(
                share.recipientAccountId,
                share.recipientCalendarId,
            );
            if (recipientCalendar?.visibility === "shared") {
                gateway.deleteCalendar({
                    ownerAccountId: share.recipientAccountId,
                    calendarId: share.recipientCalendarId,
                });
            }
        }
        await gateway.flushStore();
        const timer = shareExpiryTimers.get(shareId);
        if (timer) clearTimeout(timer);
        shareExpiryTimers.delete(shareId);
        ctx.log?.("info", "Removed delivered calendar user share.", {
            component: "calendar",
            operation: "remove_user_share_delivery",
            shareId,
            recipientAccountIds: shares.map(
                (share) => share.recipientAccountId,
            ),
        });
        return true;
    };

    const removeDeliveredCalendarRecipient = async (
        share: Awaited<
            ReturnType<CalendarShareRegistry["listCalendarUserSharesByTokenId"]>
        >[number],
    ) => {
        await shareRegistry.deleteCalendarUserShare({
            ownerAccountId: share.ownerAccountId,
            ownerCalendarId: share.ownerCalendarId,
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
        }
    };

    const scheduleCalendarShareExpiry = (
        shareId: string,
        expiresAt: string,
    ) => {
        const existingTimer = shareExpiryTimers.get(shareId);
        if (existingTimer) clearTimeout(existingTimer);
        shareExpiryTimers.delete(shareId);
        const expiryMs = Date.parse(expiresAt);
        if (!Number.isFinite(expiryMs)) return;
        const delay = Math.max(0, expiryMs - Date.now());
        const timer = setTimeout(
            () => {
                if (expiryMs > Date.now()) {
                    scheduleCalendarShareExpiry(shareId, expiresAt);
                    return;
                }
                void removeDeliveredCalendarShare(shareId).catch((error) => {
                    ctx.log?.(
                        "error",
                        "Failed to expire calendar user share.",
                        {
                            component: "calendar",
                            operation: "expire_user_share_delivery",
                            shareId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                });
            },
            Math.min(delay, 2_147_483_647),
        );
        timer.unref?.();
        shareExpiryTimers.set(shareId, timer);
    };
    ctx.capabilities.contribute("calendar:resolveShareLink", (token: string) =>
        shareRegistry.resolveShareLink(token),
    );
    ctx.capabilities.contribute(
        "share:deliverUserShare:calendar",
        async (delivery: {
            shareId: string;
            resourceType: string;
            resourceId: string;
            ownerAccountId: string;
            recipientAccountId: string;
            grantedCapabilities: string[];
            expiresAt: string;
        }) => {
            if (delivery.resourceType !== "calendar") return null;
            if (delivery.ownerAccountId === delivery.recipientAccountId) {
                return {
                    navigationUrl: `/calendar?calendarId=${encodeURIComponent(delivery.resourceId)}`,
                };
            }
            const ownerCalendar = gateway.getOwnedCalendar(
                delivery.ownerAccountId,
                delivery.resourceId,
            );
            if (!ownerCalendar || !delivery.recipientAccountId) return null;
            const existing = (
                await shareRegistry.listCalendarUserShares(
                    delivery.ownerAccountId,
                    delivery.resourceId,
                )
            ).find(
                (share) =>
                    share.recipientAccountId === delivery.recipientAccountId,
            );
            const recipientCalendarId =
                existing?.recipientCalendarId ??
                gateway.createCalendar({
                    ownerAccountId: delivery.recipientAccountId,
                    name: `${ownerCalendar.name} (Shared by ${delivery.ownerAccountId})`,
                    visibility: "shared",
                    color: normalizeCalendarColor(ownerCalendar.color),
                }).id;
            await shareRegistry.upsertCalendarUserShare({
                shareId: delivery.shareId,
                ownerAccountId: delivery.ownerAccountId,
                ownerCalendarId: delivery.resourceId,
                recipientAccountId: delivery.recipientAccountId,
                recipientCalendarId,
                permission: delivery.grantedCapabilities.includes(
                    "calendar:write",
                )
                    ? "write"
                    : "read",
                expiresAt: delivery.expiresAt,
            });
            scheduleCalendarShareExpiry(delivery.shareId, delivery.expiresAt);
            await gateway.flushStore();
            ctx.log?.("info", "Delivered calendar user share.", {
                component: "calendar",
                operation: "deliver_user_share",
                calendarId: delivery.resourceId,
                recipientAccountId: delivery.recipientAccountId,
                permission: delivery.grantedCapabilities.includes(
                    "calendar:write",
                )
                    ? "write"
                    : "read",
            });
            return {
                navigationUrl: `/calendar?calendarId=${encodeURIComponent(recipientCalendarId)}`,
                feedback: existing
                    ? null
                    : {
                          messageKey: "gateway.calendar.share_import_success",
                          stringsBaseUrl: [
                              "/static/gateways/calendar/ui/languages",
                          ],
                      },
            };
        },
    );
    ctx.capabilities.contribute(
        "share:resolveVariants",
        (variantInput: {
            resourceType: string;
            resourceId: string;
            token: string;
            shareUrl: string;
            grantedCapabilities: string[];
            metadata?: Record<string, string> | null;
        }) => {
            if (variantInput.resourceType !== "calendar") {
                return [
                    {
                        id: "web",
                        label: "Web",
                        url: variantInput.shareUrl,
                        contentType: "text/html",
                    },
                ];
            }
            const encodedToken = encodeURIComponent(variantInput.token);
            const calendar = gateway.getCalendar(variantInput.resourceId);
            const calendarPathName = encodeURIComponent(
                String(
                    calendar?.name ??
                        variantInput.metadata?.resourceName ??
                        "calendar",
                ),
            );
            const access = variantInput.grantedCapabilities.includes(
                "calendar:write",
            )
                ? "write"
                : "read";
            return [
                {
                    id: "web",
                    label: "Web",
                    access,
                    url: variantInput.shareUrl,
                    contentType: "text/html",
                },
                {
                    id: "ics",
                    label: "ICS",
                    access: "read",
                    url: `/api/v1/calendar/ics/share/${encodedToken}/${calendarPathName}.ics`,
                    contentType: "text/calendar",
                },
                {
                    id: "caldav",
                    label: "CalDAV",
                    access,
                    url: `/api/v1/calendar/caldav/share/${encodedToken}/${calendarPathName}/`,
                    contentType: "text/calendar",
                },
            ];
        },
    );
    if (ctx.flow.exists("mint-share-token")) {
        ctx.flow.extend(
            "mint-share-token",
            "validate-resource",
            { id: "calendar-gateway:validate-share-resource" },
            (stageCtx) => {
                const flowInput = (stageCtx.input ?? {}) as {
                    resourceType?: string;
                    resourceId?: string;
                    ownerAccountId?: string;
                    password?: string | null;
                };
                if (flowInput.resourceType !== "calendar") {
                    return {
                        valid: false,
                        reason: "unsupported_resource_type",
                    };
                }
                const calendar = gateway.getOwnedCalendar(
                    String(flowInput.ownerAccountId ?? ""),
                    String(flowInput.resourceId ?? ""),
                );
                if (
                    calendar?.visibility === "private" &&
                    !String(flowInput.password ?? "").trim()
                ) {
                    return {
                        valid: false,
                        reason: "share_password_required",
                    };
                }
                return calendar
                    ? {
                          valid: true,
                          resourceType: "calendar",
                          resourceId: calendar.id,
                          metadata: {
                              resourceName: calendar.name,
                              resourceTypeLabel: "calendar",
                          },
                          ownerAccountId: String(
                              flowInput.ownerAccountId ?? "",
                          ),
                      }
                    : { valid: false, reason: "resource_not_found" };
            },
        );
        ctx.flow.extend(
            "mint-share-token",
            "authorize-minter",
            { id: "calendar-gateway:authorize-share-minter" },
            (stageCtx) => {
                const result = (
                    stageCtx.stageResults["validate-resource"] ?? []
                ).find(
                    (entry) =>
                        (entry as { valid?: boolean; resourceType?: string })
                            .valid === true &&
                        (entry as { resourceType?: string }).resourceType ===
                            "calendar",
                ) as { ownerAccountId?: string } | undefined;
                return result
                    ? {
                          authorized: true,
                          ownerAccountId: result.ownerAccountId,
                      }
                    : { authorized: false, reason: "invalid_resource" };
            },
        );
    }
    if (ctx.flow.exists("resolve-share-token")) {
        ctx.flow.extend(
            "resolve-share-token",
            "resolve-resource",
            { id: "calendar-gateway:resolve-shared-calendar" },
            (stageCtx) => {
                const tokenRecord = (
                    stageCtx.stageResults["validate-token"] ?? []
                ).find(
                    (entry) =>
                        (entry as { valid?: boolean }).valid === true &&
                        (entry as { tokenRecord?: { resourceType?: string } })
                            .tokenRecord?.resourceType === "calendar",
                ) as
                    | {
                          tokenRecord?: {
                              resourceType?: string;
                              resourceId?: string;
                          };
                      }
                    | undefined;
                const calendarId = String(
                    tokenRecord?.tokenRecord?.resourceId ?? "",
                );
                const calendar = gateway.getCalendar(calendarId);
                return calendar
                    ? {
                          resolved: true,
                          resourceType: "calendar",
                          resourceId: calendarId,
                          payload: {
                              calendar,
                              events: gateway.listEvents(calendarId),
                              ics: gateway.exportCalendarAsIcs(calendarId),
                          },
                      }
                    : { resolved: false, reason: "resource_not_found" };
            },
        );
        ctx.flow.extend(
            "resolve-share-token",
            "check-access",
            { id: "calendar-gateway:allow-resolved-share" },
            (stageCtx) => {
                const resolved = (
                    stageCtx.stageResults["resolve-resource"] ?? []
                ).some(
                    (entry) =>
                        (
                            entry as {
                                resolved?: boolean;
                                resourceType?: string;
                            }
                        ).resolved === true &&
                        (entry as { resourceType?: string }).resourceType ===
                            "calendar",
                );
                return resolved
                    ? { allowed: true, directAccess: false }
                    : { allowed: false, reason: "resource_unavailable" };
            },
        );
    }
    if (ctx.flow.exists("construct-share-page")) {
        ctx.flow.extend(
            "construct-share-page",
            "resolve-resource-renderer",
            { id: "calendar-gateway:share-renderer" },
            (stageCtx) =>
                String(
                    (stageCtx.input as { resourceType?: unknown })
                        ?.resourceType ?? "",
                ) === "calendar"
                    ? {
                          mountScriptUrl:
                              "/static/gateways/calendar/ui/share-renderer.js",
                          stringsBaseUrl: [
                              "/static/gateways/calendar/ui/languages",
                          ],
                          stylesheetUrls: [
                              "/static/gateways/calendar/ui/calendar.css",
                              "/static/gateways/calendar/ui/share-renderer.css",
                          ],
                      }
                    : null,
        );
    }
    if (ctx.flow.exists("revoke-share-token")) {
        ctx.flow.extend(
            "revoke-share-token",
            "authorize-revocation",
            { id: "calendar-gateway:authorize-share-revocation" },
            (stageCtx) => {
                const flowInput = (stageCtx.input ?? {}) as {
                    claims?: { sub?: string };
                    shareId?: string;
                    resourceType?: string;
                    resourceId?: string;
                };
                const ownerAccountId = String(flowInput.claims?.sub ?? "");
                return flowInput.resourceType === "calendar" &&
                    Boolean(
                        gateway.getOwnedCalendar(
                            ownerAccountId,
                            String(flowInput.resourceId ?? ""),
                        ),
                    )
                    ? {
                          authorized: true,
                          ownerAccountId,
                          shareId: flowInput.shareId,
                          resourceType: flowInput.resourceType,
                          resourceId: flowInput.resourceId,
                      }
                    : { authorized: false, reason: "forbidden" };
            },
        );
        ctx.flow.extend(
            "revoke-share-token",
            "remove-delivery",
            { id: "calendar-gateway:remove-share-delivery" },
            async (stageCtx) => {
                const flowInput = (stageCtx.input ?? {}) as {
                    shareId?: string;
                    resourceType?: string;
                };
                if (
                    flowInput.resourceType !== "calendar" ||
                    !flowInput.shareId
                ) {
                    return null;
                }
                const deletionResults =
                    stageCtx.stageResults["delete-token"] ?? [];
                if (
                    !deletionResults.some((result) =>
                        Boolean((result as { revoked?: boolean })?.revoked),
                    )
                ) {
                    return { removed: false };
                }
                return {
                    removed: await removeDeliveredCalendarShare(
                        flowInput.shareId,
                    ),
                };
            },
        );
    }
    if (ctx.flow.exists("update-share-token")) {
        ctx.flow.extend(
            "update-share-token",
            "reconcile-deliveries",
            { id: "calendar-gateway:reconcile-share-deliveries" },
            async (stageCtx) => {
                const updateResult = (
                    stageCtx.stageResults["update-token"] ?? []
                ).find((result) =>
                    Boolean((result as { updated?: boolean })?.updated),
                ) as {
                    updated?: boolean;
                    updatedToken?: {
                        id?: string;
                        resourceType?: string;
                        accessControls?: {
                            recipients?: Array<{
                                type?: string;
                                id?: string;
                            }>;
                        };
                        grantedCapabilities?: string[];
                        expiresAt?: string;
                    };
                } | null;
                const updatedToken = updateResult?.updatedToken;
                if (
                    !updateResult?.updated ||
                    updatedToken?.resourceType !== "calendar" ||
                    !updatedToken.id
                ) {
                    return null;
                }
                const recipientIds = new Set(
                    (updatedToken.accessControls?.recipients ?? [])
                        .filter((recipient) => recipient.type === "user")
                        .map((recipient) => String(recipient.id ?? ""))
                        .filter(Boolean),
                );
                const deliveredShares =
                    await shareRegistry.listCalendarUserSharesByTokenId(
                        updatedToken.id,
                    );
                for (const deliveredShare of deliveredShares) {
                    if (!recipientIds.has(deliveredShare.recipientAccountId)) {
                        await removeDeliveredCalendarRecipient(deliveredShare);
                        continue;
                    }
                    await shareRegistry.upsertCalendarUserShare({
                        shareId: updatedToken.id,
                        ownerAccountId: deliveredShare.ownerAccountId,
                        ownerCalendarId: deliveredShare.ownerCalendarId,
                        recipientAccountId: deliveredShare.recipientAccountId,
                        recipientCalendarId: deliveredShare.recipientCalendarId,
                        recipientHandle: deliveredShare.recipientHandle,
                        recipientDisplayName:
                            deliveredShare.recipientDisplayName,
                        recipientAvatarKey: deliveredShare.recipientAvatarKey,
                        permission: updatedToken.grantedCapabilities?.includes(
                            "calendar:write",
                        )
                            ? "write"
                            : "read",
                        expiresAt: String(updatedToken.expiresAt ?? ""),
                    });
                }
                if (deliveredShares.length > 0) {
                    scheduleCalendarShareExpiry(
                        updatedToken.id,
                        String(updatedToken.expiresAt ?? ""),
                    );
                    await gateway.flushStore();
                }
                return {
                    reconciled: true,
                    deliveredCount: deliveredShares.length,
                };
            },
        );
    }

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
            status?: "busy" | "free" | "tentative";
            recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
        }) => gateway.addEvent(input),
    );
    ctx.capabilities.contribute("calendar:listEvents", (calendarId: string) =>
        gateway.listEvents(calendarId),
    );
    ctx.capabilities.contribute(
        "calendar:getCurrentAvailability",
        async (
            accountId: string,
        ): Promise<"free" | "busy" | "tentative" | null> => {
            const now = Date.now();
            const activeEvents = gateway
                .listCalendars(accountId)
                .flatMap((calendar) => gateway.listEvents(calendar.id))
                .filter(
                    (event) =>
                        new Date(event.startAt).getTime() <= now &&
                        new Date(event.endAt).getTime() > now,
                );
            if (
                activeEvents.some(
                    (event) => event.responses[accountId] === "tentative",
                )
            ) {
                return "tentative";
            }
            if (activeEvents.some((event) => event.status === "busy"))
                return "busy";
            return activeEvents.length ? "free" : null;
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
            resolveAccountDisplayName,
            log: ctx.log,
            getDispatchNotification: () =>
                notificationResolver.getDispatchNotification(),
            ensureNotificationCategory: () =>
                notificationResolver.ensureCategory(),
            getCapability: <T>(capabilityId: string) =>
                ctx.capabilities.get<T>(capabilityId),
            runUpcomingEventsFlow: async (input) => {
                if (!systemCtx?.flow.exists("calendar-upcoming-events")) {
                    return [
                        gateway.listUpcomingEvents(
                            input.accountId,
                            input.limit,
                        ),
                    ];
                }
                const result = await systemCtx.flow.run(
                    "calendar-upcoming-events",
                    input,
                );
                return result.stageResults["project-events"] ?? [];
            },
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
        version: "1.4.52",
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
