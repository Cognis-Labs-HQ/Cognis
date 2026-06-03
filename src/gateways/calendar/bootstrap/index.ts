import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { createGatewayUiRegistryHooks } from "../../reuse/ui-registry-hooks.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { GatewayBootstrapContext } from "../shared.js";
import { DbCalendarStore } from "../calendar-store.js";
import { normalizeCalendarColor } from "../color.js";
import { CoreCalendarGateway, type CalendarVisibility } from "../gateway.js";
import { createCalendarAdapterRoutes } from "./adapter-routes.js";
import { createCalendarCoreRoutes } from "./calendar-routes.js";
import type { ResolveAccountId } from "./helpers.js";
import { createCalendarNotificationResolver } from "./notification-capabilities.js";

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
    const resolveAccountId = ctx.capabilities.get<ResolveAccountId>(
        "auth:resolveAccountId",
    );

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
            status?: "busy" | "free";
            recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
        }) => gateway.addEvent(input),
    );
    ctx.capabilities.contribute("calendar:listEvents", (calendarId: string) =>
        gateway.listEvents(calendarId),
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
            routeContext,
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

    ctx.gatewayRegistry.register({
        id: "calendar",
        name: "Calendar Gateway",
        version: "1.0.1",
        description:
            "Internal calendar management with pluggable CalDAV and ICS adapters.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
}
