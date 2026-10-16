import { apiFetch } from "/static/reuse/api-client.js";

export async function fetchDrawingProgress(cardId, { signal } = {}) {
    const response = await apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        { signal },
    );
    if (!response.ok) throw new Error("drawing_progress_failed");
    return (await response.json()).data;
}

export async function recordDrawingCompletion(
    cardId,
    completion,
    { signal } = {},
) {
    const response = await apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(completion),
        },
    );
    if (!response.ok) throw new Error("drawing_progress_failed");
    return (await response.json()).data;
}
