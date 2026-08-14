import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCalendarAdapterRoutes } from "./adapter-routes.js";
import { createCalendarCoreRoutes } from "./calendar-routes.js";
import { createStatusPreferenceRoutes } from "./status-preference/index.js";
import { registerCalendarUi } from "./ui-registration.js";
import { registerCalendarComponent } from "./component-registration.js";
import { createCalendarHtmlRoute } from "./html-route.js";
export const GATEWAY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

export async function finalizeCalendarBootstrap(input: any): Promise<void> {
    const {
        ctx,
        gateway,
        shareRegistry,
        routeContext,
        routeHelpers,
        adaptersRoot,
        getPreferenceStore,
        resolveMeetingsProviderAvailability,
        resolveShareableUsers,
        resolveAccountId,
        resolveAccountDisplayName,
        notificationResolver,
        systemCtx,
        gatewayRoot,
    } = input;
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
        createStatusPreferenceRoutes({
            routeContext,
            getPreference: (accountId) =>
                getPreferenceStore()?.get(
                    accountId,
                    "calendar-prevent-status-updates",
                ) ?? Promise.resolve(null),
            setPreference: (accountId, prevented) => {
                const preferenceStore = getPreferenceStore();
                if (!preferenceStore) {
                    return Promise.resolve(false);
                }
                return preferenceStore
                    .set(
                        accountId,
                        "calendar-prevent-status-updates",
                        String(prevented),
                    )
                    .then(() => true);
            },
            log: ctx.log,
        }),
        "calendar",
    );
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

    ctx.routeRegistry.register(
        createCalendarHtmlRoute(gatewayRoot, routeHelpers),
        "calendar",
    );
    ctx.routeRegistry.register(
        createCalendarAdapterRoutes(
            "calendar",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "calendar",
    );

    registerCalendarUi(ctx, gatewayRoot);
    registerCalendarComponent(ctx);
}
