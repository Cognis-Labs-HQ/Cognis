import { apiFetch } from "/static/reuse/api-client.js";

async function request(path, method = "GET", body) {
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
