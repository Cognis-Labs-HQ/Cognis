function parseJsonLikeString(value: string): unknown {
    const trimmed = value.trim();
    const appearsToBeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (appearsToBeJson) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }
    return value;
}

export function normalizeResponse(payload: unknown): unknown {
    return typeof payload === "string" ? parseJsonLikeString(payload) : payload;
}

export function toRecordOrNull(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null) return null;
    return value as Record<string, unknown>;
}

export function findMessageInPayload(payload: unknown): string | null {
    const response = toRecordOrNull(normalizeResponse(payload));
    if (!response) return null;

    const responseMessage = response.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
        return responseMessage;
    }

    const data = toRecordOrNull(response.data);
    const dataMessage = data?.message;
    if (typeof dataMessage === "string" && dataMessage.trim()) {
        return dataMessage;
    }

    const error = toRecordOrNull(response.error);
    const errorMessage = error?.message;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
        return errorMessage;
    }

    return null;
}
