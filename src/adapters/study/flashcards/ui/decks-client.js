import { apiFetch } from "/static/reuse/api-client.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { isOffline } from "/static/reuse/offline-state.js";

import { uiCtx } from "/static/reuse/ui-ctx.js";

export function mountProvider(ctx) {
    const read = createOfflineReadCache({ signal: ctx.signal });
    ctx.capabilities.contribute("study:decks:offlineRead", read);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["adapter.study.flashcards"],
        ctx.signal,
    );
}

async function request(path, method = "GET", body) {
    if (isOffline() && method !== "GET")
        throw new Error("offline_operation_unavailable");
    const load = async () => {
        const response = await apiFetch(`/api/v1/study/decks${path}`, {
            method,
            ...(body
                ? {
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                  }
                : {}),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.code ?? "deck_failed");
        return result.data;
    };
    if (method !== "GET") return load();
    const read = uiCtx.capabilities.get("study:decks:offlineRead");
    if (!read) throw new Error("decks_client_unavailable");
    return read(path, load);
}

export const fetchStudyDecks = () => request("");
export const fetchStudyDeck = (id) => request(`/${encodeURIComponent(id)}`);
export const saveStudyDeck = (input, id) =>
    request(id ? `/${encodeURIComponent(id)}` : "", id ? "PUT" : "POST", input);
export const deleteStudyDeck = (id) =>
    request(`/${encodeURIComponent(id)}`, "DELETE");
export const reviewStudyCard = (id, cardId, grade, attempt) =>
    request(`/${encodeURIComponent(id)}/review`, "POST", {
        cardId,
        grade,
        attempt,
    });
