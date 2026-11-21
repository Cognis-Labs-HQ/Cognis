/** Serializes producer-authorized resolutions without replaying unconfirmed writes. */
export function createCorrelationResolver({
    inbox,
    isActive,
    generation,
    change,
    clearPresentation,
    reportError,
    log,
}) {
    let queue = Promise.resolve();
    const pending = new Map();
    const attempted = new Set();

    async function resolveCorrelation(correlationId, expected) {
        const current = () => isActive() && generation() === expected;
        await inbox.settled;
        if (!current()) return;
        await inbox.read();
        let reading;
        do {
            reading = inbox.reading;
            await reading;
        } while (current() && reading !== inbox.reading);
        if (!current() || inbox.failed || !inbox.rows) return;
        for (const id of attempted) {
            if (!inbox.rows.some((notification) => notification.id === id))
                attempted.delete(id);
        }
        const matches = inbox.rows.filter(
            (notification) =>
                String(notification.metadata?.correlationId ?? "") ===
                correlationId,
        );
        for (const notification of matches) {
            if (attempted.has(notification.id)) continue;
            await inbox.settled;
            if (!current() || inbox.failed) return;
            const currentNotification = inbox.rows?.find(
                (row) => row.id === notification.id,
            );
            if (
                String(currentNotification?.metadata?.correlationId ?? "") !==
                correlationId
            )
                continue;
            attempted.add(notification.id);
            if (!(await change("dismiss", notification.id))) return;
        }
    }

    return {
        resolve(correlationId) {
            if (!correlationId || !isActive() || pending.has(correlationId))
                return;
            clearPresentation(correlationId);
            const expected = generation();
            const task = queue.then(() =>
                resolveCorrelation(correlationId, expected),
            );
            pending.set(correlationId, task);
            queue = task
                .catch((error) => {
                    log?.("error", "Notification resolution failed.", {
                        component: "notify-internal",
                        operation: "resolveCorrelation",
                        errorName: error?.name,
                    });
                    if (isActive() && generation() === expected)
                        reportError("error_change_uncertain");
                })
                .finally(() => {
                    if (pending.get(correlationId) === task)
                        pending.delete(correlationId);
                });
        },
        reset() {
            pending.clear();
            attempted.clear();
            queue = Promise.resolve();
        },
    };
}
