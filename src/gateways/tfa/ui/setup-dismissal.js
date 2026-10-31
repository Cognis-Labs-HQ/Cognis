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
                    resumeNavigation = event.detail;
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
            const navigation = signal?.aborted ? undefined : resumeNavigation;
            resumeNavigation = undefined;
            controller.abort();
            if (typeof navigation?.resume !== "function") return undefined;
            return () => {
                if (signal?.aborted) return false;
                const event = new CustomEvent("cognis:route-before-navigate", {
                    cancelable: true,
                    detail: navigation,
                });
                // Enrollment is closed; remaining page guards still get their own decision.
                return target.dispatchEvent(event)
                    ? navigation.resume()
                    : false;
            };
        },
    };
}
