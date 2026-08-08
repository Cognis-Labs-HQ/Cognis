import type { GatewayBootstrapContext } from "../shared.js";

export function registerCalendarComponent(ctx: GatewayBootstrapContext): void {
    ctx.routeRegistry.registerPrefix("/api/v1/calendar", "calendar");
    ctx.gatewayRegistry.register({
        id: "calendar",
        name: "Calendar Gateway",
        version: "1.4.74",
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
