import { fetchStudyPreferences } from "/static/gateways/study/navigation-client.js";
import { deckMatchesLanguage } from "./app/language.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { createI18n } from "/static/reuse/i18n.js";
import { loadDeckTemplates } from "./app/markup.js";
import { readStudySnapshot } from "/static/gateways/study/offline-content.js";
import {
    deliverOrQueue,
    recordQueuedActivity,
} from "/static/reuse/offline-delivery.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { isOffline } from "/static/reuse/offline-state.js";

import { uiCtx } from "/static/reuse/ui-ctx.js";

export async function mountProvider(ctx) {
    const read = createOfflineReadCache({
        signal: ctx.signal,
        maxEntries: 10_001,
        maxBytes: 64_000_000,
    });
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
    bindOfflineSnapshotRefresh(ctx, {
        id: "flashcards:prepareVisibleDecks",
        events: ["cognis:study-enrollment-changed"],
        refresh: async () => {
            const assertAccount = captureAccountGuard();
            const preferences = await fetchStudyPreferences({
                signal: ctx.signal,
            });
            const languages = new Set([
                ...(preferences.learningLanguages ?? []),
                ...(preferences.teachingLanguages ?? []),
            ]);
            const decks = (
                await request("", "GET", undefined, ctx.signal)
            ).filter((deck) =>
                [...languages].some((language) =>
                    deckMatchesLanguage(deck, language),
                ),
            );
            let next = 0;
            await Promise.all(
                Array.from({ length: Math.min(2, decks.length) }, async () => {
                    while (next < decks.length && !isOffline()) {
                        ctx.signal.throwIfAborted();
                        assertAccount();
                        await request(
                            `/${encodeURIComponent(decks[next++].id)}`,
                            "GET",
                            undefined,
                            ctx.signal,
                        );
                    }
                }),
            );
        },
    });
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["adapter.study.flashcards"],
        ctx.signal,
    );
    await Promise.all([
        createI18n({
            componentStringBaseUrls: [
                "/static/gateways/study/languages",
                "/static/adapters/study/flashcards/languages",
                "/static/gateways/share/languages",
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
        void recordQueuedActivity(uiCtx, {
            id: attempt.id,
            type: "study.flashcards",
            occurredAt: attempt.occurredAt,
            meta: { action: "review", result: grade },
        });
    return result;
};
