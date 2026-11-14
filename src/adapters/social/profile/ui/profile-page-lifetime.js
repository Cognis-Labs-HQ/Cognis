import { uiCtx } from "/static/reuse/ui-ctx.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";

/** Own asynchronous page work across routes, sessions and provider lifetimes. */
export function createProfilePageLifetime({ root, signal, onDispose }) {
    const controller = new AbortController();
    const assertAccount = captureAccountGuard();
    const providerSignal = uiCtx.capabilities.get("social:profilePageSignal");
    const request = uiCtx.capabilities.get("social:profileRequest");
    const path = window.location.pathname;
    const provider = localStorage.getItem("cognis_provider_id");
    const hookId = `social:profile:page:${crypto.randomUUID()}`;

    function dispose() {
        if (controller.signal.aborted) return;
        controller.abort();
        signal?.removeEventListener("abort", dispose);
        providerSignal?.removeEventListener("abort", dispose);
        uiCtx.removeFlowHook("authenticate-session", "afterSession", hookId);
        onDispose();
    }

    function isCurrent() {
        if (controller.signal.aborted) return false;
        let valid = false;
        try {
            assertAccount();
            valid =
                !!request &&
                !!providerSignal &&
                !providerSignal.aborted &&
                root.isConnected &&
                window.location.pathname === path &&
                localStorage.getItem("cognis_provider_id") === provider &&
                uiCtx.capabilities.get("social:profileRequest") === request;
        } catch (error) {
            console.info("[profile] page identity changed", {
                component: "social-profile",
                operation: "disposePage",
                errorName: error?.name,
            });
        }
        if (!valid) dispose();
        return valid;
    }

    signal?.addEventListener("abort", dispose, { once: true });
    providerSignal?.addEventListener("abort", dispose, { once: true });
    window.addEventListener("storage", isCurrent, {
        signal: controller.signal,
    });
    uiCtx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id: hookId },
        isCurrent,
    );
    if (signal?.aborted) dispose();
    function listen(element, type, listener) {
        element?.addEventListener(
            type,
            (event) => {
                if (isCurrent()) return listener(event);
            },
            { signal: controller.signal },
        );
    }

    return { signal: controller.signal, isCurrent, dispose, listen };
}
