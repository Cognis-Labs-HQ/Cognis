function contentSignature(notification) {
    if (!notification) return null;
    const { read, ...content } = notification;
    return JSON.stringify(content);
}

/** Binds pending and visible popups to current inbox content without changing read policies. */
export function createArrivalLifetime({ getRows, isActive, refresh }) {
    const records = new Map();

    function retire(id, record) {
        if (records.get(id) !== record) return;
        records.delete(id);
        record.element?.remove();
        record.cancel?.();
    }

    return {
        begin(notification) {
            const prior = records.get(notification.id);
            if (prior) retire(notification.id, prior);
            const record = { signature: contentSignature(notification) };
            records.set(notification.id, record);
            const isCurrent = () =>
                isActive() &&
                records.get(notification.id) === record &&
                contentSignature(
                    getRows().find((row) => row.id === notification.id),
                ) === record.signature;
            return {
                isCurrent,
                attach(element, cancel) {
                    record.element = element;
                    record.cancel = cancel;
                },
                release() {
                    if (records.get(notification.id) === record)
                        records.delete(notification.id);
                    record.cancel?.();
                },
            };
        },
        reconcile() {
            for (const [id, record] of records) {
                const current = getRows().find((row) => row.id === id);
                if (contentSignature(current) === record.signature) continue;
                retire(id, record);
                if (current && isActive()) refresh(current);
            }
        },
        clearCorrelation(correlationId) {
            for (const notification of getRows()) {
                if (
                    String(notification.metadata?.correlationId ?? "") !==
                    correlationId
                )
                    continue;
                const record = records.get(notification.id);
                if (record) retire(notification.id, record);
            }
        },
        clear() {
            for (const [id, record] of records) retire(id, record);
        },
    };
}
