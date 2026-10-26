import {
    deliverOrQueue,
    recordQueuedActivity,
} from "/static/reuse/offline-delivery.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { apiFetch } from "/static/reuse/api-client.js";

const pendingCompletions = new Map();

export async function fetchDrawingProgress(cardId, { signal } = {}) {
    if (isOffline()) return { completed: false, hiddenStrokeCount: 0 };
    await pendingCompletions.get(cardId);
    const response = await apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        { signal },
    );
    if (!response.ok) throw new Error("drawing_progress_failed");
    return (await response.json()).data;
}

export function registerDrawingDelivery(ctx) {
    const outbox = ctx.capabilities.get("offline:outbox");
    if (!outbox) throw new Error("offline_delivery_unavailable");
    return outbox.register(
        "study.drawing",
        ({ cardId, completion }) =>
            sendDrawingCompletion(cardId, completion, ctx.signal),
        ctx.signal,
    );
}

async function sendDrawingCompletion(cardId, completion, signal) {
    const response = await apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        {
            method: "POST",
            keepalive: true,
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(completion),
        },
    );
    if (!response.ok)
        throw Object.assign(new Error("drawing_progress_failed"), {
            status: response.status,
        });
    return (await response.json()).data;
}

export function recordDrawingCompletion(cardId, completion) {
    completion = {
        ...completion,
        attempt: completion.attempt ?? {
            id: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
        },
    };
    const pending = deliverOrQueue(
        uiCtx,
        "study.drawing",
        completion.attempt.id,
        { cardId, completion },
        () => sendDrawingCompletion(cardId, completion),
    ).then(async (result) => {
        if (result?.queued)
            void recordQueuedActivity(uiCtx, {
                id: completion.attempt.id,
                occurredAt: completion.attempt.occurredAt,
                type: "study.drawing",
                meta: {
                    action: "practice",
                    ...(completion.result ? { result: completion.result } : {}),
                },
            });
        return result;
    });
    pendingCompletions.set(cardId, pending);
    const release = () => {
        if (pendingCompletions.get(cardId) === pending)
            pendingCompletions.delete(cardId);
    };
    pending.then(release, release);
    return pending;
}
