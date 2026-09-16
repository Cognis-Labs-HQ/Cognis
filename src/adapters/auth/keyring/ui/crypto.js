export function encodeBytes(bytes) {
    const chunkSize = 32_768;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(offset, offset + chunkSize),
        );
    }
    return btoa(binary);
}

export function decodeBytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function normalizeEntry(value, id) {
    if (value && typeof value === "object" && "value" in value) {
        return {
            value: String(value.value ?? ""),
            label: String(value.label ?? id),
            source: String(value.source ?? "user"),
            updatedAt: String(value.updatedAt ?? new Date(0).toISOString()),
        };
    }
    return {
        value: String(value ?? ""),
        label: String(id),
        source: "legacy",
        updatedAt: new Date(0).toISOString(),
    };
}

export async function deriveKey(password, salt, iterations) {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

function envelopeTimestamp(envelope) {
    const timestamp = Date.parse(String(envelope?.updatedAt ?? ""));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

export function selectKeyringEnvelope(localEnvelope, remoteState) {
    const localAccountInstanceId = String(
        localEnvelope?.accountInstanceId ?? "",
    );
    const remoteAccountInstanceId = String(remoteState.accountInstanceId ?? "");
    if (
        remoteState.resolved &&
        localAccountInstanceId &&
        remoteAccountInstanceId &&
        localAccountInstanceId !== remoteAccountInstanceId
    ) {
        return null;
    }
    if (!remoteState.resolved) return localEnvelope;
    return envelopeTimestamp(remoteState.envelope) >
        envelopeTimestamp(localEnvelope)
        ? remoteState.envelope
        : localEnvelope;
}
