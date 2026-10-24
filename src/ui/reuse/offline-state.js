/** Connectivity state carries no session, permission or private response data. */
const stateKey = Symbol.for("cognis.offlineState");
const state = (globalThis[stateKey] ??= { offline: false });

export function isOffline() {
    return state.offline || globalThis.navigator?.onLine === false;
}

export function setOffline(offline) {
    if (state.offline === offline) return;
    state.offline = offline;
    if (offline) scheduleRecovery();
    if (typeof globalThis.CustomEvent !== "function") return;
    globalThis.window?.dispatchEvent?.(
        new CustomEvent("cognis:connectivity-changed", { detail: { offline } }),
    );
}

export async function offlineWorkerRequest(type) {
    const worker = globalThis.navigator?.serviceWorker?.controller;
    if (!worker) return [];
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => {
            channel.port1.close();
            reject(new Error("offline_worker_timeout"));
        }, 5000);
        channel.port1.onmessage = ({ data }) => {
            clearTimeout(timeout);
            channel.port1.close();
            if (data.error) reject(new Error(data.error));
            else resolve(data.result);
        };
        worker.postMessage({ type }, [channel.port2]);
    });
}

if (
    typeof globalThis.window?.addEventListener === "function" &&
    !state.listenersInstalled
) {
    state.listenersInstalled = true;
    window.addEventListener("offline", () => setOffline(true));
    window.addEventListener("storage", (event) => {
        if (
            ["cognis_account", "cognis_access_token"].includes(event.key) &&
            event.oldValue !== event.newValue
        ) {
            void offlineWorkerRequest("COGNIS_INVALIDATE_OFFLINE_ROUTES").catch(
                (error) => {
                    console.error("[offline] account cleanup failed", error);
                },
            );
        }
    });
    globalThis.navigator?.serviceWorker?.addEventListener?.(
        "message",
        ({ data }) => {
            if (data?.type === "COGNIS_OFFLINE") setOffline(true);
        },
    );
    window.addEventListener("online", () => {
        if (isOffline()) scheduleRecovery();
    });
}

let recoveryTimer;
function scheduleRecovery() {
    if (
        recoveryTimer ||
        typeof globalThis.window?.addEventListener !== "function"
    )
        return;
    recoveryTimer = setTimeout(async () => {
        recoveryTimer = null;
        if (!isOffline()) return;
        try {
            const response = await fetch("/api/v1/system/healthcheck", {
                cache: "no-store",
                signal: AbortSignal.timeout(4000),
            });
            if (response.ok) {
                await offlineWorkerRequest("COGNIS_REFRESH_OFFLINE_ROUTES");
                const resume = () => window.location.reload();
                if (
                    window.dispatchEvent(
                        new CustomEvent("cognis:route-before-navigate", {
                            cancelable: true,
                            detail: { path: window.location.pathname, resume },
                        }),
                    )
                )
                    resume();
                return;
            }
        } catch (error) {
            console.info("[offline] server still unavailable", {
                operation: "recoveryProbe",
            });
        }
        scheduleRecovery();
    }, 5000);
}
