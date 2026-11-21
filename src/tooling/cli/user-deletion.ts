import { ApiRequestError, apiRequest } from "./http.ts";
import { cliText } from "./reuse/locale.ts";

type DeletionState = "committed" | "rejected" | "unknown";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | undefined {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as RecordValue)
        : undefined;
}

function fields(
    value: RecordValue | undefined,
    names: string[],
): value is RecordValue {
    return (
        value !== undefined &&
        Object.keys(value).length === names.length &&
        names.every((name) => Object.hasOwn(value, name))
    );
}

function failureState(error: ApiRequestError): DeletionState {
    const payload = record(error.payload);
    const failure = record(payload?.error);
    const data = record(payload?.data);
    if (!fields(payload, ["error", "data"])) return "unknown";
    if (
        error.status === 500 &&
        fields(failure, ["code"]) &&
        failure.code === "user_deletion_cleanup_incomplete" &&
        fields(data, ["deleted", "outcome", "cleanup"]) &&
        data.deleted === true &&
        data.outcome === "committed" &&
        data.cleanup === "incomplete"
    )
        return "committed";
    if (
        fields(failure, ["code", "message"]) &&
        typeof failure.message === "string" &&
        failure.message.trim().length > 0 &&
        fields(data, ["deleted", "outcome"]) &&
        data.deleted === false &&
        data.outcome === "rejected"
    ) {
        const refusals: Record<string, number> = {
            bad_request: 400,
            forbidden: 403,
            protected_self_account: 403,
            protected_admin_account: 403,
            protected_founder_account: 403,
            not_found: 404,
        };
        if (
            typeof failure.code === "string" &&
            Object.hasOwn(refusals, failure.code) &&
            refusals[failure.code] === error.status
        )
            return "rejected";
    }
    return "unknown";
}

export class UserDeletionError extends Error {
    constructor(
        readonly outcome: DeletionState,
        cause?: unknown,
    ) {
        super(cliText(`delete.${outcome}`), { cause });
        this.name = "UserDeletionError";
    }
}

/** A submitted DELETE cannot be retried safely based on a missing response. */
export async function deleteUserAccount(
    apiBaseUrl: string,
    username: string,
    apiToken: string,
): Promise<unknown> {
    let payload: unknown;
    try {
        payload = await apiRequest(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}`,
            {
                method: "DELETE",
                apiToken,
                expectedStatus: 200,
            },
        );
    } catch (error) {
        throw new UserDeletionError(
            error instanceof ApiRequestError ? failureState(error) : "unknown",
            error,
        );
    }
    const response = record(payload);
    const data = record(response?.data);
    if (
        !fields(response, ["data"]) ||
        !fields(data, ["deleted"]) ||
        data.deleted !== true
    ) {
        throw new UserDeletionError("unknown");
    }
    return payload;
}
