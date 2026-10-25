import { createI18n } from "./i18n.js";
import { openPopup } from "./popup.js";
import { escapeHtml } from "./escape-html.js";
import { offlinePolicy } from "./offline-policy.js";
import { uiCtx } from "./ui-ctx.js";
import {
    isOffline,
    offlineWorkerRequest,
    enableOfflineAutoRefresh,
} from "./offline-state.js";

const sessionRoutes = new Set();
uiCtx.capabilities.contribute(
    "offline:registerSessionRoutes",
    (ids, signal) => {
        for (const id of ids) sessionRoutes.add(id);
        const dispose = () => {
            for (const id of ids) sessionRoutes.delete(id);
        };
        signal.addEventListener("abort", dispose, { once: true });
        return dispose;
    },
);
uiCtx.capabilities.contribute("offline:isSessionRouteAvailable", (route) =>
    sessionRoutes.has(route?.id),
);

export function offlineRouteAvailable(route) {
    return (
        (route?.public !== true && route?.offline?.session === true) ||
        uiCtx.capabilities.get("offline:isSessionRouteAvailable")?.(route) ===
            true ||
        (route?.public === true &&
            Boolean(route.offline) &&
            route.offlineAvailable === true)
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
            (!isOffline() ||
                (offlinePolicy.allows() && offlineRouteAvailable(input.route))),
    }),
);
uiCtx.extendFlow(
    "offline:prepareNavigation",
    "report",
    { id: "ui:offlineReport" },
    async ({ input, stageResults }) => {
        const allowed = stageResults.validate[0].allowed;
        if (!allowed && !input.signal?.aborted) {
            console.info("[offline] navigation unavailable", {
                component: "ui",
                operation: "prepareNavigation",
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
    () => {
        // Public cache maintenance must not hold authenticated navigation open.
        void offlineWorkerRequest("COGNIS_INVALIDATE_OFFLINE_ROUTES")
            .then(
                () =>
                    !isOffline() &&
                    offlineWorkerRequest("COGNIS_REFRESH_OFFLINE_ROUTES"),
            )
            .catch((error) =>
                console.error("[offline] login cache maintenance failed", {
                    operation: "refreshAfterLogin",
                    code: error?.message,
                }),
            );
        return { scheduled: true };
    },
);

let recoveryPromise;
const recoveryFlow = "offline:recoverNavigation";
if (!uiCtx.flowExists(recoveryFlow)) {
    uiCtx.registerFlow(recoveryFlow, ["notify", "restore", "recover"]);
    uiCtx.extendFlow(
        recoveryFlow,
        "notify",
        { id: "ui:offlineRecovery" },
        async ({ input }) => {
            if (input.notify === false) return;
            const i18n = await createI18n();
            await openPopup({
                title: i18n.t("ui.reuse.offline_mode_active"),
                body: `<p>${escapeHtml(i18n.t("ui.reuse.offline_page_unavailable"))}</p>`,
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                ],
            });
        },
    );
    uiCtx.extendFlow(
        recoveryFlow,
        "restore",
        { id: "ui:offlineRecovery" },
        async ({ input, data }) => {
            try {
                data.restored = (await input.restore()) === true;
            } catch (error) {
                data.restored = false;
                console.info("[offline] previous page unavailable", {
                    operation: "restorePreviousPage",
                    errorName: error?.name,
                });
            }
        },
    );
    uiCtx.extendFlow(
        recoveryFlow,
        "recover",
        { id: "ui:offlineRecovery" },
        async ({ input, data }) => {
            if (!data.restored) {
                enableOfflineAutoRefresh();
                await input.fallback?.();
            }
            return { restored: data.restored };
        },
    );
}

/** Show unavailable-page feedback once, restore the previous view or wait for guarded recovery. */
export function recoverOfflineNavigation({ restore, notify = true, fallback }) {
    if (recoveryPromise) return recoveryPromise;
    recoveryPromise = uiCtx
        .runFlow(recoveryFlow, { restore, notify, fallback })
        .then((result) => result.data.restored)
        .finally(() => {
            recoveryPromise = null;
        });
    return recoveryPromise;
}
