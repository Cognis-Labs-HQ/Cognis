import { uiCtx } from "./ui-ctx.js";
import { beginButtonLoading } from "./button-loading.js";
import {
    isOffline,
    offlineEnabled,
    hasRecoveredConnection,
    refreshAfterOffline,
    recheckConnectivity,
} from "./offline-state.js";
import { escapeHtml } from "./escape-html.js";

const owners = new WeakMap();
const refreshFlow = "offline:refreshPage";
if (!uiCtx.flowExists(refreshFlow)) {
    uiCtx.registerFlow(refreshFlow, ["validate", "navigate"]);
    uiCtx.extendFlow(
        refreshFlow,
        "validate",
        { id: "ui:offlineRefresh" },
        () => ({ allowed: hasRecoveredConnection() }),
    );
    uiCtx.extendFlow(
        refreshFlow,
        "navigate",
        { id: "ui:offlineRefresh" },
        ({ stageResults }) =>
            stageResults.validate[0].allowed && refreshAfterOffline(),
    );
}

const recheckFlow = "offline:recheckConnectivity";
if (!uiCtx.flowExists(recheckFlow)) {
    uiCtx.registerFlow(recheckFlow, ["check"]);
    uiCtx.extendFlow(
        recheckFlow,
        "check",
        { id: "ui:recheckConnectivity" },
        () => recheckConnectivity(),
    );
}

/** Mount one top-of-page notice using the shared callout and guarded navigation. */
export function mountOfflineStatus(
    root,
    { i18n, signal, unavailable = false } = {},
) {
    owners.get(root)?.();
    if (signal?.aborted) return;
    if (!root) return;
    const banners = uiCtx.capabilities.get("ui:broadcast");
    if (!banners) throw new Error("top_banners_unavailable");
    void banners.prepare();
    const controller = new AbortController();
    let notice;
    let releaseBanner;
    let checking = false;
    const render = () => {
        const mode = !offlineEnabled()
            ? ""
            : isOffline()
              ? "offline"
              : hasRecoveredConnection()
                ? "recovered"
                : "";
        if (!mode || controller.signal.aborted) {
            releaseBanner?.();
            notice = null;
            return;
        }
        const banner = banners.publish(
            "ui.offline",
            {
                variant: mode === "offline" ? "warning" : "success",
                collapsible: true,
                background:
                    mode === "offline"
                        ? "linear-gradient(180deg, transparent 0 2px, rgb(from var(--surface-2) r g b / 1) 2px 100%), repeating-linear-gradient(135deg, #f59e0b 0 10px, #fff7ed 10px 20px)"
                        : undefined,
                title: i18n.t(
                    mode === "offline"
                        ? "ui.reuse.offline_mode_active"
                        : "ui.reuse.offline_connection_restored",
                ),
                bodyHtml:
                    mode === "offline" && unavailable
                        ? escapeHtml(
                              i18n.t("ui.reuse.offline_page_unavailable"),
                          )
                        : "",
                actionsHtml:
                    mode === "recovered"
                        ? `<button type="button" class="btn-confirm btn-animated" data-offline-refresh>${escapeHtml(i18n.t("ui.reuse.refresh"))}</button>`
                        : `<button type="button" class="btn-neutral btn-animated${checking ? " button-loading" : ""}" data-offline-recheck${checking ? ' disabled aria-busy="true"' : ""}>${escapeHtml(i18n.t("ui.reuse.recheck_connectivity"))}</button>`,
            },
            { priority: -100, signal: controller.signal },
        );
        notice = banner.element;
        notice.dataset.offlineStatus = mode;
        releaseBanner = banner.remove;
        notice.querySelector("[data-offline-recheck]")?.addEventListener(
            "click",
            async (event) => {
                if (checking || controller.signal.aborted) return;
                checking = true;
                const finish = beginButtonLoading(event.currentTarget);
                try {
                    await uiCtx.runFlow(recheckFlow, {});
                } catch (error) {
                    console.info(
                        "[offline] connectivity recheck could not finish",
                        {
                            operation: "recheckConnectivity",
                            errorName: error?.name,
                        },
                    );
                } finally {
                    finish();
                    checking = false;
                    render();
                }
            },
            { signal: controller.signal },
        );
        notice.querySelector("[data-offline-refresh]")?.addEventListener(
            "click",
            () => {
                void uiCtx.runFlow(refreshFlow, {});
            },
            { signal: controller.signal },
        );
    };
    for (const type of [
        "cognis:connectivity-changed",
        "cognis:offline-preference-changed",
        "cognis:connection-restored",
        "storage",
    ])
        window.addEventListener(type, render, { signal: controller.signal });
    const dispose = () => {
        controller.abort();
        releaseBanner?.();
        if (owners.get(root) === dispose) owners.delete(root);
    };
    signal?.addEventListener("abort", dispose, { once: true });
    owners.set(root, dispose);
    render();
    return dispose;
}
