export function startClassroomRealtimeRefresh({
    signal,
    intervalMs = 3000,
    shouldRefresh,
    refresh,
}) {
    if (typeof refresh !== "function") return;
    let busy = false;
    const timerId = window.setInterval(() => {
        if (busy || (typeof shouldRefresh === "function" && !shouldRefresh())) {
            return;
        }
        busy = true;
        Promise.resolve(refresh())
            .catch((error) => {
                console.debug("[classroom] realtime refresh failed.", error);
            })
            .finally(() => {
                busy = false;
            });
    }, intervalMs);
    signal?.addEventListener(
        "abort",
        () => {
            clearInterval(timerId);
        },
        { once: true },
    );
}
