import { apiFetch } from "/static/reuse/api-client.js";

export async function createCall(roomId) {
    const response = await apiFetch("/api/v1/social/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(payload?.error?.message ?? "Request failed");
    return payload.data;
}

export async function getCall(callId) {
    const response = await apiFetch(
        `/api/v1/social/call/${encodeURIComponent(callId)}`,
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(payload?.error?.message ?? "Request failed");
    return payload.data;
}

export async function getRoomCall(roomId) {
    const response = await apiFetch(
        `/api/v1/social/call/room/${encodeURIComponent(roomId)}`,
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(payload?.error?.message ?? "Request failed");
    return payload.data;
}

export async function updateCall(callId, operation) {
    const response = await apiFetch(
        `/api/v1/social/call/${encodeURIComponent(callId)}/${operation}`,
        { method: "POST" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(payload?.error?.message ?? "Request failed");
    return payload.data;
}

export async function setCallRinging(callId, ringerId, active = true) {
    const response = await apiFetch(
        `/api/v1/social/call/${encodeURIComponent(callId)}/ringing`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ringerId, active }),
        },
    );
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload.data?.ringing === true;
}
