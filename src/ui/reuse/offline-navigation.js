import { uiCtx } from "./ui-ctx.js";
import { isOffline, offlineWorkerRequest } from "./offline-state.js";
import { createI18n } from "./i18n.js";
import { openRuntimeErrorPopup } from "./runtime-error-popup.js";

export function offlineRouteAvailable(route) {
    return (
        route?.public === true &&
        Boolean(route.offline) &&
        route.offlineAvailable === true
    );
}

if (!uiCtx.flowExists("offline:prepareNavigation")) {
    uiCtx.registerFlow("offline:prepareNavigation", ["validate", "report"]);
}
uiCtx.extendFlow(
    "offline:prepareNavigation",
    "validate",
    { id: "ui:offlineValidate" },
    ({ input }) => ({
        allowed:
            !input.signal?.aborted &&
            (!isOffline() || offlineRouteAvailable(input.route)),
    }),
);
uiCtx.extendFlow(
    "offline:prepareNavigation",
    "report",
    { id: "ui:offlineReport" },
    async ({ input, stageResults }) => {
        const allowed = stageResults.validate[0].allowed;
        if (!allowed && !input.signal?.aborted) {
            const i18n = await createI18n();
            if (input.signal?.aborted) return { allowed: false };
            await openRuntimeErrorPopup({
                error: new Error(i18n.t("ui.reuse.offline_page_unavailable")),
                contextKey: "ui.reuse.runtime_error_context_route_load",
                contextDetail: input.path,
            });
        }
        return { allowed };
    },
);

export async function allowOfflineRoute(route, path, signal) {
    const result = await uiCtx.runFlow("offline:prepareNavigation", {
        route,
        path,
        signal,
    });
    return result.stageResults.report[0].allowed;
}

uiCtx.capabilities.contribute(
    "offline:isRouteAvailable",
    offlineRouteAvailable,
);

uiCtx.extendFlow(
    "logout",
    "clearSession",
    { id: "ui:clearOfflineRoutes" },
    async () => {
        await offlineWorkerRequest("COGNIS_INVALIDATE_OFFLINE_ROUTES").catch(
            (error) => console.error("[offline] account cleanup failed", error),
        );
    },
);
uiCtx.extendFlow(
    "complete-login",
    "setup-account-services",
    { id: "ui:refreshOfflineRoutes" },
    async () => {
        await offlineWorkerRequest("COGNIS_INVALIDATE_OFFLINE_ROUTES").catch(
            (error) => console.error("[offline] account cleanup failed", error),
        );
        if (!isOffline())
            await offlineWorkerRequest("COGNIS_REFRESH_OFFLINE_ROUTES").catch(
                (error) =>
                    console.error("[offline] catalog refresh failed", error),
            );
    },
);
