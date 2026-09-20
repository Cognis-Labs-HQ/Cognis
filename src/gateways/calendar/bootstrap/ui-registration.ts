import { createGatewayUiRegistryHooks } from "../../reuse/ui-registry-hooks.js";
import type { GatewayBootstrapContext } from "../shared.js";

export function registerCalendarUi(
    ctx: GatewayBootstrapContext,
    gatewayRoot: string,
): void {
    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "calendar");
    uiHooks.registerStaticDir("calendar", gatewayRoot);
    uiHooks.registerNavbarPlugin(
        "/static/gateways/calendar/ui/navbar.js",
        () => ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    );
    if (ctx.flow.exists("construct-settings-ui")) {
        ctx.flow.extend(
            "construct-settings-ui",
            "augment-sections",
            { id: "calendar-gateway:status-preference" },
            () => ({
                gatewayId: "calendar",
                sectionId: "calendar-status-preference",
                targetSectionId: "general",
                scriptUrl: "/static/gateways/calendar/ui/status-prefs.js",
                stringsBaseUrl: "/static/gateways/calendar/ui/languages",
            }),
        );
    }
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
}
