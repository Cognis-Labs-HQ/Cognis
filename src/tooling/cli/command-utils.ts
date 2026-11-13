import { ApiRequestError, apiGet } from "./http.ts";
import {
    findMessageInPayload,
    normalizeResponse,
    toRecordOrNull,
} from "./payload.ts";

export function failMissingArgs(missing: string[], usage: string): never {
    const names = missing.map((name) => `"${name}"`).join(", ");
    throw new Error(
        `Not enough arguments (missing: ${names})\n\nUsage:\n  ${usage}`,
    );
}

export function requireArgs(
    args: string[],
    names: string[],
    usage: string,
): void {
    const missing = names.filter((_, index) => !args[index]);
    if (missing.length > 0) failMissingArgs(missing, usage);
}

export function mergePayloadFields(
    payload: unknown,
    fields: Record<string, unknown>,
): Record<string, unknown> {
    const base =
        typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : {};

    return { ...fields, ...base };
}

export function ensureBooleanAcknowledgement(
    payload: unknown,
    key: string,
    expectedValue: boolean,
    failurePrefix: string,
): void {
    const response = toRecordOrNull(normalizeResponse(payload));
    const data = toRecordOrNull(response?.data);
    if (!data || !(key in data)) return;
    if (data[key] === expectedValue) return;

    const message = findMessageInPayload(payload);
    if (message) throw new Error(`${failurePrefix}: ${message}`);
    throw new Error(failurePrefix);
}

export async function ensureUserExists(
    apiBaseUrl: string,
    getApiToken: () => Promise<string>,
    username: string,
): Promise<void> {
    try {
        await apiGet(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/info`,
            await getApiToken(),
        );
    } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
            throw new Error(`User "${username}" not found.`);
        }

        throw error;
    }
}
