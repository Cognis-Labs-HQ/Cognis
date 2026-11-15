import { captureAccountGuard } from "../../reuse/offline-identity.js";

let sequence = 0;

export function createAdministrationLifetime({ root, signal, ctx }) {
    const controller = new AbortController();
    const assertAccount = captureAccountGuard();
    const provider = globalThis.localStorage?.getItem("cognis_provider_id");
    const hook = `administration:page:${++sequence}`;
    const dispose = () => {
        controller.abort();
        signal?.removeEventListener("abort", dispose);
        ctx.removeFlowHook("authenticate-session", "afterSession", hook);
    };
    function isCurrent() {
        if (controller.signal.aborted) return false;
        try {
            assertAccount();
        } catch (error) {
            const log = ctx.capabilities.get("ui:log");
            log?.("info", "administration_authority_changed", {
                component: "administration",
                operation: "disposePage",
                errorName: error?.name,
            });
            dispose();
            return false;
        }
        if (
            root.isConnected === false ||
            globalThis.localStorage?.getItem("cognis_provider_id") !== provider
        )
            dispose();
        return !controller.signal.aborted;
    }
    ctx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id: hook },
        isCurrent,
    );
    signal?.addEventListener("abort", dispose, { once: true });
    window.addEventListener("storage", isCurrent, {
        signal: controller.signal,
    });
    if (signal?.aborted) dispose();
    return { signal: controller.signal, isCurrent, dispose };
}
