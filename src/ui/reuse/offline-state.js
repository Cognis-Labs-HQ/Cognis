/**
 * Owns opt-in connectivity state, worker messaging and guarded recovery.
 * Exports: offlineEnabled, isOffline, isOfflineTransition, setOffline, offlineCacheGeneration and offlineWorkerRequest.
 * @example if (isOffline()) return;
 */
const stateKey = Symbol.for("cognis.offlineState");
const state = (globalThis[stateKey] ??= { offline: false });

export function offlineCacheGeneration() {
    return state.cacheGeneration ?? 0;
}

export function offlineEnabled() {
    try {
        const owner = globalThis.localStorage?.getItem(
            "cognis_offline_preference_account",
        );
        if (
            owner &&
            owner !== globalThis.localStorage?.getItem("cognis_account")
        )
            return true;
        const preferences = JSON.parse(
            globalThis.localStorage?.getItem("cognis_ui_preferences") ?? "null",
        );
        return preferences?.offlineEnabled !== false;
    } catch (error) {
        console.error("[offline] preference read failed", {
            operation: "readPreference",
        });
        return true;
    }
}

export function isOffline() {
    return (
        offlineEnabled() &&
        (state.offline || globalThis.navigator?.onLine === false)
    );
}

export function isOfflineTransition() {
    return (
        isOffline() &&
        state.changedAt > 0 &&
        Date.now() - state.changedAt <= 5_000
    );
}

export function setOffline(offline) {
    if (offline && !offlineEnabled()) return;
    if (offline) state.changedAt = Date.now();
    if (state.offline === offline) return;
    state.offline = offline;
    if (offline) scheduleRecovery();
    if (typeof globalThis.CustomEvent !== "function") return;
    globalThis.window?.dispatchEvent?.(
        new CustomEvent("cognis:connectivity-changed", { detail: { offline } }),
    );
}

export async function offlineWorkerRequest(type, options = {}) {
    const worker = globalThis.navigator?.serviceWorker?.controller;
    if (!worker) return [];
    const coalesced = [
        "COGNIS_REFRESH_OFFLINE_ROUTES",
        "COGNIS_OFFLINE_ROUTES",
        "COGNIS_OFFLINE_REQUIREMENTS",
    ].includes(type);
    const requests = (state.workerRequests ??= new Map());
    const previous = requests.get(type);
    if (coalesced && previous?.worker === worker) return previous.promise;
    const promise = new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const finish = (error, result) => {
            clearTimeout(timeout);
            channel.port1.close();
            channel.port2.close();
            if (error) reject(error);
            else resolve(result);
        };
        const timeout = setTimeout(
            () => finish(new Error("offline_worker_timeout")),
            5000,
        );
        channel.port1.onmessage = ({ data }) => {
            if (!data || typeof data !== "object")
                return finish(new Error("offline_worker_invalid_reply"));
            finish(data.error ? new Error(data.error) : null, data.result);
        };
        channel.port1.onmessageerror = () =>
            finish(new Error("offline_worker_invalid_reply"));
        try {
            worker.postMessage({ ...options, type }, [channel.port2]);
        } catch (error) {
            finish(error);
        }
    });
    const record = { worker, promise };
    if (coalesced) requests.set(type, record);
    try {
        const result = await promise;
        if (
            type === "COGNIS_INVALIDATE_OFFLINE_ROUTES" &&
            typeof globalThis.CustomEvent === "function"
        ) {
            globalThis.window?.dispatchEvent?.(
                new CustomEvent("cognis:offline-worker-reset"),
            );
        }
        return result;
    } finally {
        if (requests.get(type) === record) requests.delete(type);
    }
}

if (
    typeof globalThis.window?.addEventListener === "function" &&
    !state.listenersInstalled
) {
    state.listenersInstalled = true;
    window.addEventListener("offline", () => setOffline(true));
    window.addEventListener("cognis:module-lifecycle-changed", () => {
        state.cacheGeneration = offlineCacheGeneration() + 1;
    });
    window.addEventListener("cognis:offline-preference-changed", () => {
        state.cacheGeneration = offlineCacheGeneration() + 1;
        if (!offlineEnabled()) setOffline(false);
        void offlineWorkerRequest("COGNIS_OFFLINE_PREFERENCE", {
            enabled: offlineEnabled(),
        }).catch((error) =>
            console.error("[offline] preference sync failed", error),
        );
    });
    window.addEventListener("storage", (event) => {
        if (event.key === "cognis_ui_preferences") {
            state.cacheGeneration = offlineCacheGeneration() + 1;
            if (!offlineEnabled()) setOffline(false);
            void offlineWorkerRequest("COGNIS_OFFLINE_PREFERENCE", {
                enabled: offlineEnabled(),
            }).catch((error) =>
                console.error("[offline] preference sync failed", error),
            );
        }
        if (
            ["cognis_account", "cognis_access_token"].includes(event.key) &&
            event.oldValue !== event.newValue
        ) {
            state.cacheGeneration = offlineCacheGeneration() + 1;
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
        let reachable = false;
        try {
            const response = await fetch("/api/v1/system/healthcheck", {
                cache: "no-store",
                signal: AbortSignal.timeout(4000),
            });
            if (response.ok) {
                reachable = true;
                setOffline(false);
                const tasks = [];
                window.dispatchEvent(
                    new CustomEvent("cognis:connection-restoring", {
                        detail: { waitUntil: (task) => tasks.push(task) },
                    }),
                );
                await Promise.all(tasks);
                void offlineWorkerRequest(
                    "COGNIS_REFRESH_OFFLINE_ROUTES",
                ).catch((error) => {
                    console.error(
                        "[offline] recovery cache maintenance failed",
                        {
                            operation: "refreshAfterRecovery",
                            code: error?.message,
                        },
                    );
                });
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
            if (reachable) {
                console.error("[offline] session recovery failed", {
                    operation: "restoreSession",
                    errorName: error?.name,
                });
                return;
            }
            setOffline(true);
            console.info("[offline] server still unavailable", {
                operation: "recoveryProbe",
            });
        }
        scheduleRecovery();
    }, 5000);
}
