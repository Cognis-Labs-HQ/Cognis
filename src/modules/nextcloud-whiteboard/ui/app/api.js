import { apiFetch } from "/static/reuse/api-client.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";

export async function apiFetchJson(path, options = {}) {
    const response = await apiFetch(`${API_BASE}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(
            new Error(payload?.error?.message ?? "Request failed."),
            { status: response.status, code: payload?.error?.code },
        );
    }
    return payload.data;
}

export async function fetchWhiteboardList() {
    return apiFetchJson("/whiteboards");
}

export async function renameWhiteboard(boardId, title, failureMessage) {
    const normalizedTitle = String(title ?? "").trim();
    const normalizedBoardId = String(boardId ?? "").trim();
    if (!normalizedBoardId || !normalizedTitle) {
        throw new Error(failureMessage);
    }
    return apiFetchJson("/whiteboards/rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: normalizedBoardId, title: normalizedTitle }),
    });
}

export async function spawnWhiteboard({ title, participants = [] } = {}) {
    return apiFetchJson("/whiteboards/spawn", {
        method: "POST",
        body: JSON.stringify({ title, participants }),
    });
}

export async function fetchWhiteboardSession(boardId) {
    return apiFetchJson(
        `/whiteboards/session?id=${encodeURIComponent(boardId)}`,
    );
}

export async function saveWhiteboardElements(boardId, elements) {
    return apiFetchJson("/whiteboards/elements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: boardId, elements }),
    });
}

export { API_BASE };
