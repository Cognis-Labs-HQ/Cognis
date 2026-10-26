import { uiCtx } from "/static/reuse/ui-ctx.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { deliverOrQueue } from "/static/reuse/offline-delivery.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { readStudySnapshot } from "../offline-content.js";

const key = (kind, id) => `${kind}:${id}`;
const identity = () =>
    JSON.stringify([
        localStorage.getItem("cognis_account"),
        localStorage.getItem("cognis_access_token"),
    ]);

/** Share favourites and their guarded snapshots across every browser loader. @returns {Function} Delivery cleanup. */
export function registerFavouriteClient(ctx) {
    const outbox = ctx.capabilities.get("offline:outbox");
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!outbox || !registerActions)
        throw new Error("favourites_contract_unavailable");
    const read = createOfflineReadCache({ signal: ctx.signal });
    let active = new Set();
    let actor;
    const has = (kind, id) =>
        !ctx.signal.aborted &&
        actor === identity() &&
        active.has(key(kind, id));
    const save = async (input, signal = ctx.signal) => {
        const response = await apiFetch("/api/v1/study/favourites", {
            method: "PUT",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok)
            throw Object.assign(new Error("favourites_failed"), {
                status: response.status,
            });
        return (await response.json()).data;
    };
    const actions = registerActions(ctx, "study:favourites", {
        load: async ({ signal } = {}) => {
            const assertAccount = captureAccountGuard();
            const items = await readStudySnapshot(
                () =>
                    read("favourites", async () => {
                        const response = await apiFetch(
                            "/api/v1/study/favourites",
                            {
                                signal: signal
                                    ? AbortSignal.any([ctx.signal, signal])
                                    : ctx.signal,
                            },
                        );
                        if (!response.ok)
                            throw Object.assign(
                                new Error("favourites_failed"),
                                { status: response.status },
                            );
                        return (await response.json()).data;
                    }),
                [],
            );
            const pending = await outbox.pending("study.favourites");
            assertAccount();
            active = new Set(items.map((item) => key(item.kind, item.id)));
            for (const { payload } of pending) {
                if (payload.favourite)
                    active.add(key(payload.kind, payload.id));
                else active.delete(key(payload.kind, payload.id));
            }
            actor = identity();
        },
        toggle: async ({ kind, id, favourite, signal }) => {
            if (
                !["library", "deck", "flashcard"].includes(kind) ||
                typeof id !== "string" ||
                !id.trim() ||
                typeof favourite !== "boolean"
            )
                throw new TypeError("invalid_favourite");
            const assertAccount = captureAccountGuard();
            const result = await deliverOrQueue(
                ctx,
                "study.favourites",
                crypto.randomUUID(),
                { kind, id, favourite },
                (input) =>
                    save(
                        input,
                        signal
                            ? AbortSignal.any([ctx.signal, signal])
                            : ctx.signal,
                    ),
            );
            assertAccount();
            if (actor !== identity()) active.clear();
            if (result?.queued) {
                if (favourite) active.add(key(kind, id));
                else active.delete(key(kind, id));
            } else
                active = new Set(result.map((item) => key(item.kind, item.id)));
            actor = identity();
            return result;
        },
    });
    ctx.capabilities.contribute("study:favourites", { ...actions, has });
    bindOfflineSnapshotRefresh(ctx, {
        id: "study:prepareFavouriteSnapshot",
        refresh: () => actions.load({ signal: ctx.signal }),
    });
    return outbox.register(
        "study.favourites",
        (input) => save(input),
        ctx.signal,
    );
}

/** Resolve the active provider rather than a loader-local cache. @returns {object} Scoped favourites client. */
export function favouriteClient() {
    const client = uiCtx.capabilities.get("study:favourites");
    if (!client) throw new Error("favourites_client_unavailable");
    return client;
}
