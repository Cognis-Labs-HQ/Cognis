import { apiFetch } from "/static/reuse/api-client.js";

const pendingCompletions = new Map();

export async function fetchDrawingProgress(cardId, { signal } = {}) {
    await pendingCompletions.get(cardId);
    const response = await apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        { signal },
    );
    if (!response.ok) throw new Error("drawing_progress_failed");
    return (await response.json()).data;
}

export function recordDrawingCompletion(cardId, completion) {
    const pending = apiFetch(
        `/api/v1/study/drawing/${encodeURIComponent(cardId)}`,
        {
            method: "POST",
            keepalive: true,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(completion),
        },
    ).then(async (response) => {
        if (!response.ok) throw new Error("drawing_progress_failed");
        return (await response.json()).data;
    });
    pendingCompletions.set(cardId, pending);
    const release = () => {
        if (pendingCompletions.get(cardId) === pending)
            pendingCompletions.delete(cardId);
    };
    pending.then(release, release);
    return pending;
}
