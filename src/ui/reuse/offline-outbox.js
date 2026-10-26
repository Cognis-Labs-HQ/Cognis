/**
 * Bounded durable delivery for explicitly registered, idempotent component actions.
 * Public exports: createOfflineOutbox — create an account-scoped queued delivery service.
 * @example const outbox = createOfflineOutbox(options); await outbox.submit('practice', id, payload);
 * @param {object} options Injected identity, access, storage, lock and connectivity contracts.
 * @returns {object} Register, submit, flush and clear operations.
 */
const STORAGE_KEY = "cognis_offline_outbox";
const MAX_ITEMS = 1000;
const MAX_BYTES = 1_000_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PERMANENT_STATUS = new Set([400, 403, 404, 409, 410, 413, 422]);

function requestLock(name, operation) {
    if (!globalThis.navigator?.locks)
        throw new Error("offline_storage_lock_unavailable");
    return navigator.locks.request(name, operation);
}

export function createOfflineOutbox({
    identity,
    enabled,
    offline,
    allowed,
    storage = () => globalThis.localStorage,
    withLock = (operation) => requestLock("cognis-offline-outbox", operation),
    withDeliveryLock = (operation) =>
        requestLock("cognis-offline-delivery", operation),
    now = () => Date.now(),
    changed = () => {},
    log = (level, message, meta) => console[level]?.(message, meta),
}) {
    const handlers = new Map();
    let flushing;
    function read() {
        const rows = JSON.parse(storage().getItem(STORAGE_KEY) ?? "[]");
        if (
            !Array.isArray(rows) ||
            rows.length > MAX_ITEMS ||
            JSON.stringify(rows).length * 2 > MAX_BYTES ||
            rows.some(
                (row) =>
                    !row ||
                    typeof row.account !== "string" ||
                    typeof row.owner !== "string" ||
                    typeof row.id !== "string" ||
                    !row.payload ||
                    typeof row.payload !== "object" ||
                    !Number.isFinite(row.createdAt) ||
                    (row.protectOnClose !== undefined &&
                        typeof row.protectOnClose !== "boolean"),
            )
        )
            throw new Error("invalid_offline_outbox");
        return rows.filter(
            (row) =>
                Number.isFinite(row.createdAt) &&
                row.createdAt > now() - MAX_AGE_MS,
        );
    }
    function write(rows) {
        const serialized = JSON.stringify(rows);
        if (rows.length > MAX_ITEMS || serialized.length * 2 > MAX_BYTES)
            throw new Error("offline_outbox_full");
        storage().setItem(STORAGE_KEY, serialized);
        changed();
    }
    function current(expected) {
        const actual = identity();
        return (
            actual.account &&
            actual.account === expected.account &&
            actual.session === expected.session
        );
    }
    async function acknowledge(item, actor) {
        await withLock(() => {
            if (!current(actor)) return;
            const rows = read();
            write(
                rows.filter(
                    (row) =>
                        !(
                            row.account === item.account &&
                            row.owner === item.owner &&
                            row.id === item.id
                        ),
                ),
            );
        });
    }
    async function flush() {
        if (flushing) return flushing;
        const actor = identity();
        if (!actor.account || !actor.session || offline() || !allowed())
            return { sent: 0, rejected: 0 };
        flushing = withDeliveryLock(async () => {
            const result = { sent: 0, rejected: 0 };
            if (!current(actor) || offline() || !allowed()) return result;
            const rows = await withLock(() => read());
            const blockedOwners = new Set();
            for (const item of [...rows]) {
                if (item.account !== actor.account) continue;
                const registration = handlers.get(item.owner);
                if (!registration || blockedOwners.has(item.owner)) continue;
                if (!current(actor) || offline() || !allowed()) break;
                const stillPending = await withLock(() =>
                    read().some(
                        (row) =>
                            row.account === item.account &&
                            row.owner === item.owner &&
                            row.id === item.id,
                    ),
                );
                if (!stillPending) continue;
                if (!current(actor) || offline() || !allowed()) break;
                try {
                    registration.signal.throwIfAborted();
                    await registration.send(
                        structuredClone(item.payload),
                        item.id,
                    );
                    if (!current(actor) || registration.signal.aborted) break;
                    await acknowledge(item, actor);
                    result.sent++;
                } catch (error) {
                    log("error", "Queued action delivery failed.", {
                        component: "ui",
                        operation: "flushOutbox",
                        owner: item.owner,
                        status: error?.status ?? null,
                        errorName: error?.name,
                    });
                    if (
                        !current(actor) ||
                        registration.signal.aborted ||
                        offline() ||
                        error?.status === 401
                    )
                        break;
                    if (!PERMANENT_STATUS.has(error?.status)) {
                        blockedOwners.add(item.owner);
                        continue;
                    }
                    await acknowledge(item, actor);
                    result.rejected++;
                }
            }
            log("info", "Queued delivery completed.", {
                component: "ui",
                operation: "flushOutbox",
                ...result,
            });
            return result;
        }).finally(() => {
            flushing = null;
        });
        return flushing;
    }
    return {
        register(owner, send, signal, { protectOnClose = true } = {}) {
            if (
                !/^[a-zA-Z][a-zA-Z0-9:.]{0,100}$/.test(owner) ||
                handlers.has(owner) ||
                typeof send !== "function" ||
                typeof protectOnClose !== "boolean"
            )
                throw new Error("invalid_offline_handler");
            signal.throwIfAborted();
            const registration = { send, signal, protectOnClose };
            handlers.set(owner, registration);
            const dispose = () => {
                if (handlers.get(owner) === registration)
                    handlers.delete(owner);
            };
            signal.addEventListener("abort", dispose, { once: true });
            return dispose;
        },
        async submit(owner, id, payload) {
            const actor = identity();
            if (
                !enabled() ||
                !actor.account ||
                !actor.session ||
                actor.account.startsWith("share:") ||
                !allowed() ||
                !handlers.has(owner)
            )
                throw new Error("offline_delivery_unavailable");
            if (typeof id !== "string" || !/^[a-zA-Z0-9:._-]{1,200}$/.test(id))
                throw new Error("invalid_offline_delivery_id");
            await withLock(() => {
                if (!current(actor)) throw new Error("offline_account_changed");
                if (!enabled() || !allowed() || !handlers.has(owner))
                    throw new Error("offline_delivery_unavailable");
                const rows = read();
                const existing = rows.find(
                    (row) =>
                        row.account === actor.account &&
                        row.owner === owner &&
                        row.id === id,
                );
                if (
                    existing &&
                    JSON.stringify(existing.payload) !== JSON.stringify(payload)
                )
                    throw new Error("offline_delivery_conflict");
                if (!existing)
                    rows.push({
                        owner,
                        id,
                        payload: structuredClone(payload),
                        account: actor.account,
                        createdAt: now(),
                        protectOnClose: handlers.get(owner).protectOnClose,
                    });
                write(rows);
            });
            log("info", "Activity queued for delivery.", {
                component: "ui",
                operation: "enqueueOutbox",
                owner,
            });
            return { queued: true };
        },
        flush,
        hasBufferedChanges() {
            const actor = identity();
            if (!actor.account || !actor.session) return false;
            try {
                return read().some(
                    (row) =>
                        row.account === actor.account &&
                        (row.protectOnClose ??
                            handlers.get(row.owner)?.protectOnClose ??
                            true),
                );
            } catch (error) {
                log("error", "Pending activity could not be checked.", {
                    component: "ui",
                    operation: "checkPendingChanges",
                    errorName: error.name,
                });
                return true;
            }
        },
        async hasPending() {
            const actor = identity();
            if (!actor.account || !storage()?.getItem(STORAGE_KEY))
                return false;
            return withLock(() =>
                read().some(
                    (row) =>
                        row.account === actor.account &&
                        handlers.has(row.owner),
                ),
            );
        },
        async pending(owner) {
            const actor = identity();
            if (!actor.account) return [];
            return withLock(() =>
                structuredClone(
                    read().filter(
                        (row) =>
                            row.account === actor.account &&
                            row.owner === owner,
                    ),
                ),
            );
        },
        async clear(account = identity().account) {
            if (!account) return;
            await withLock(() =>
                write(read().filter((row) => row.account !== account)),
            );
        },
    };
}
