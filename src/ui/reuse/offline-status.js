import { uiCtx } from "./ui-ctx.js";
import {
    isOffline,
    offlineEnabled,
    hasRecoveredConnection,
    refreshAfterOffline,
} from "./offline-state.js";
import { renderInPageCallout } from "./in-page-callout.js";
import { escapeHtml } from "./escape-html.js";
import { ensurePersistentStylesheet } from "./page-styles.js";

const owners = new WeakMap();
let lastMode = "";
let dismissedMode = "";
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

/** Mount a dismissible host-header notice using the shared callout and guarded navigation. */
export function mountOfflineStatus(root, { i18n, signal } = {}) {
    owners.get(root)?.();
    if (signal?.aborted) return;
    const header = root.querySelector(".site-header");
    if (!header) return;
    const controller = new AbortController();
    let notice;
    const render = () => {
        const mode = !offlineEnabled()
            ? ""
            : isOffline()
              ? "offline"
              : hasRecoveredConnection()
                ? "recovered"
                : "";
        if (mode !== lastMode) {
            lastMode = mode;
            dismissedMode = "";
        }
        notice?.remove();
        notice = null;
        if (!mode || mode === dismissedMode || controller.signal.aborted)
            return;
        notice = document.createElement("div");
        notice.dataset.offlineStatus = mode;
        notice.innerHTML = renderInPageCallout({
            variant: mode === "offline" ? "info" : "success",
            title: i18n.t(
                mode === "offline"
                    ? "ui.reuse.offline_mode_active"
                    : "ui.reuse.offline_connection_restored",
            ),
            footerHtml: `<div class="controls">${mode === "recovered" ? `<button type="button" class="btn-confirm btn-animated" data-offline-refresh>${escapeHtml(i18n.t("ui.reuse.refresh"))}</button>` : ""}<button type="button" class="btn-neutral btn-animated" data-offline-dismiss>${escapeHtml(i18n.t("ui.reuse.dismiss"))}</button></div>`,
        });
        notice.querySelector("[data-offline-refresh]")?.addEventListener(
            "click",
            () => {
                void uiCtx.runFlow(refreshFlow, {});
            },
            { signal: controller.signal },
        );
        notice.querySelector("[data-offline-dismiss]").addEventListener(
            "click",
            () => {
                dismissedMode = mode;
                notice?.remove();
            },
            { signal: controller.signal },
        );
        header.append(notice);
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
        notice?.remove();
        if (owners.get(root) === dispose) owners.delete(root);
    };
    signal?.addEventListener("abort", dispose, { once: true });
    owners.set(root, dispose);
    void ensurePersistentStylesheet(
        "/static/styles/reuse/in-page-callout.css",
    ).catch((error) =>
        console.info("[offline] status stylesheet unavailable", {
            operation: "loadStatusStyles",
            errorName: error?.name,
        }),
    );
    render();
    return dispose;
}
