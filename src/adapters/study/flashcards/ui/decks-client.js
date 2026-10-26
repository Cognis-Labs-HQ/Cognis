import { createI18n } from "/static/reuse/i18n.js";
import { loadDeckTemplates } from "./app/markup.js";
import { readStudySnapshot } from "/static/gateways/study/offline-content.js";
import { deliverOrQueue } from "/static/reuse/offline-delivery.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { isOffline } from "/static/reuse/offline-state.js";

import { uiCtx } from "/static/reuse/ui-ctx.js";

export async function mountProvider(ctx) {
    const read = createOfflineReadCache({ signal: ctx.signal });
    const outbox = ctx.capabilities.get("offline:outbox");
    if (!outbox) throw new Error("offline_delivery_unavailable");
    outbox.register(
        "study.flashcards",
        ({ id, cardId, grade, attempt }) =>
            request(
                `/${encodeURIComponent(id)}/review`,
                "POST",
                { cardId, grade, attempt },
                ctx.signal,
            ),
        ctx.signal,
    );
    ctx.capabilities.contribute("study:decks:offlineRead", read);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["adapter.study.flashcards"],
        ctx.signal,
    );
    await Promise.all([
        createI18n({
            componentStringBaseUrls: [
                "/static/gateways/study/languages",
                "/static/adapters/study/flashcards/languages",
            ],
        }),
        loadDeckTemplates(ctx.signal),
    ]);
    ctx.signal.throwIfAborted();
}

async function request(path, method = "GET", body, signal) {
    if (isOffline() && method !== "GET")
        throw new Error("offline_operation_unavailable");
    const load = async () => {
        const response = await apiFetch(`/api/v1/study/decks${path}`, {
            method,
            ...(signal ? { signal } : {}),
            ...(body
                ? {
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                  }
                : {}),
        });
        const result = await response.json();
        if (!response.ok)
            throw Object.assign(
                new Error(result.error?.code ?? "deck_failed"),
                { status: response.status },
            );
        return result.data;
    };
    if (method !== "GET") return load();
    const read = uiCtx.capabilities.get("study:decks:offlineRead");
    if (!read) throw new Error("decks_client_unavailable");
    return path === ""
        ? readStudySnapshot(() => read(path, load), [])
        : read(path, load);
}

export const fetchStudyDecks = () => request("");
export const fetchStudyDeck = (id) => request(`/${encodeURIComponent(id)}`);
export const saveStudyDeck = (input, id) =>
    request(id ? `/${encodeURIComponent(id)}` : "", id ? "PUT" : "POST", input);
export const deleteStudyDeck = (id) =>
    request(`/${encodeURIComponent(id)}`, "DELETE");
export const reviewStudyCard = async (id, cardId, grade, attempt) => {
    attempt ??= {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
    };
    const result = await deliverOrQueue(
        uiCtx,
        "study.flashcards",
        attempt.id,
        { id, cardId, grade, attempt },
        () =>
            request(`/${encodeURIComponent(id)}/review`, "POST", {
                cardId,
                grade,
                attempt,
            }),
    );
    if (result?.queued)
        await uiCtx.runFlow("activity:record", {
            id: attempt.id,
            type: "study.flashcards",
            occurredAt: attempt.occurredAt,
            meta: { action: "review", result: grade },
        });
    return result;
};
