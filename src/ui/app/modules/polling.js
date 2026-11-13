const MARKETPLACE_POLL_INTERVAL_MS = 15_000;
const MARKETPLACE_SCAN_INTERVAL_MS = 60 * 60 * 1000;

export function startMarketplacePolling({
    signal,
    isBusy,
    poll,
    reportError,
    setPending,
}) {
    if (signal.aborted) return;
    const run = () => {
        if (
            signal.aborted ||
            globalThis.document?.visibilityState === "hidden" ||
            isBusy()
        )
            return;
        setPending(true);
        void poll()
            .catch((error) => {
                if (error?.name !== "AbortError") reportError(error);
            })
            .finally(() => setPending(false));
    };
    const interval = window.setInterval(run, MARKETPLACE_POLL_INTERVAL_MS);
    signal.addEventListener("abort", () => window.clearInterval(interval), {
        once: true,
    });
}

export function reportMarketplaceSourceFailures({
    failures,
    privateFailureKeys,
    i18n,
    showToast,
}) {
    for (const failure of failures) {
        if (!privateFailureKeys.has(failure?.code)) continue;
        showToast(
            i18n
                .t(`ui.app.modules.${failure.code}`)
                .replace("{{source}}", String(failure.sourceName ?? "")),
            { type: "warning" },
        );
    }
}

export function createSerializedOperationQueue() {
    let queue = Promise.resolve();
    return (operation) => {
        const queued = queue.then(operation, operation);
        queue = queued.catch(() => {});
        return queued;
    };
}

export function createModulesPagePolling({
    isRefreshPending,
    loadKnownModules,
    discoverSources,
    log,
    translate,
}) {
    return (signal) => {
        let pollPending = false;
        let nextScanAt = 0;
        let lastSourceRevision;
        return startMarketplacePolling({
            signal,
            isBusy: () => isRefreshPending() || pollPending,
            setPending: (pending) => (pollPending = pending),
            poll: async () => {
                const state = await loadKnownModules(signal);
                if (signal.aborted) return;
                if (
                    (state?.sourceRevision !== undefined &&
                        state.sourceRevision !== lastSourceRevision) ||
                    Date.now() >= nextScanAt
                ) {
                    nextScanAt = Date.now() + MARKETPLACE_SCAN_INTERVAL_MS;
                    lastSourceRevision = state?.sourceRevision;
                    try {
                        await discoverSources(signal);
                    } catch (error) {
                        nextScanAt = Date.now() + 60_000;
                        throw error;
                    }
                }
            },
            reportError: (error) =>
                log("error", translate("ui.app.modules.polling_failed"), {
                    component: "modules-page",
                    operation: "poll-marketplace",
                    error:
                        error instanceof Error ? error.message : String(error),
                }),
        });
    };
}
