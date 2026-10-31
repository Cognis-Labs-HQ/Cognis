/** Keep enrollment dismissal and SPA navigation behind the popup’s shared discard decision. */
export function createSetupDismissalGuard({
    signal,
    target = window,
    onError,
}) {
    const controller = new AbortController();
    const scope = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
    let closed = false;
    let pending;
    let resumeNavigation;
    return {
        onOpen(_overlay, requestClose, api) {
            api.markDirty();
            target.addEventListener(
                "beforeunload",
                (event) => {
                    event.preventDefault();
                    event.returnValue = "";
                },
                { signal: scope },
            );
            target.addEventListener(
                "cognis:route-before-navigate",
                (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (pending) return;
                    resumeNavigation = event.detail?.resume;
                    pending = requestClose()
                        .then((didClose) => {
                            if (!closed && didClose !== true)
                                resumeNavigation = undefined;
                        })
                        .catch(onError)
                        .finally(() => {
                            pending = undefined;
                        });
                },
                { capture: true, signal: scope },
            );
        },
        close() {
            closed = true;
            const resume = signal?.aborted ? undefined : resumeNavigation;
            controller.abort();
            return resume;
        },
    };
}
