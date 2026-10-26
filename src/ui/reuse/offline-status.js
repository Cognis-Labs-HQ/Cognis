import { uiCtx } from "./ui-ctx.js";
import { beginButtonLoading } from "./button-loading.js";
import {
    isOffline,
    offlineEnabled,
    hasRecoveredConnection,
    refreshAfterOffline,
    recheckConnectivity,
} from "./offline-state.js";
import { renderInPageCallout } from "./in-page-callout.js";
import { escapeHtml } from "./escape-html.js";
import { ensurePersistentStylesheet } from "./page-styles.js";

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

/** Mount one host-header notice using the shared callout and guarded navigation. */
export function mountOfflineStatus(
    root,
    { i18n, signal, unavailable = false } = {},
) {
    owners.get(root)?.();
    if (signal?.aborted) return;
    const header = root.querySelector(".site-header");
    if (!header) return;
    const controller = new AbortController();
    let notice;
    let checking = false;
    const render = () => {
        const mode = !offlineEnabled()
            ? ""
            : isOffline()
              ? "offline"
              : hasRecoveredConnection()
                ? "recovered"
                : "";
        notice?.remove();
        notice = null;
        if (!mode || controller.signal.aborted) return;
        notice = document.createElement("div");
        notice.dataset.offlineStatus = mode;
        notice.innerHTML = renderInPageCallout({
            variant: mode === "offline" ? "info" : "success",
            title: i18n.t(
                mode === "offline"
                    ? "ui.reuse.offline_mode_active"
                    : "ui.reuse.offline_connection_restored",
            ),
            body:
                mode === "offline" && unavailable
                    ? i18n.t("ui.reuse.offline_page_unavailable")
                    : "",
            footerHtml:
                mode === "recovered"
                    ? `<div class="in-page-callout__actions"><button type="button" class="btn-confirm btn-animated" data-offline-refresh>${escapeHtml(i18n.t("ui.reuse.refresh"))}</button></div>`
                    : `<div class="in-page-callout__actions"><button type="button" class="btn-neutral btn-animated${checking ? " button-loading" : ""}" data-offline-recheck${checking ? ' disabled aria-busy="true"' : ""}>${escapeHtml(i18n.t("ui.reuse.recheck_connectivity"))}</button></div>`,
        });
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
    void Promise.all([
        ensurePersistentStylesheet("/static/styles/reuse/in-page-callout.css"),
        ensurePersistentStylesheet("/static/styles/reuse/buttons.css"),
    ]).catch((error) =>
        console.info("[offline] status stylesheet unavailable", {
            operation: "loadStatusStyles",
            errorName: error?.name,
        }),
    );
    render();
    return dispose;
}
