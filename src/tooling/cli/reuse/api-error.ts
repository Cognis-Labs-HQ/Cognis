import { conciseText } from "./output-summary.ts";

function formatPayloadForError(payload: unknown): string {
    if (typeof payload === "string") return conciseText(payload);
    const error = (payload as { error?: { code?: string; message?: string } })
        ?.error;
    return conciseText(
        error?.message ?? error?.code ?? "Use -v for response details.",
    );
}

export class ApiRequestError extends Error {
    constructor(
        readonly status: number,
        readonly statusText: string,
        readonly payload: unknown,
    ) {
        super(
            `API request failed (${status} ${statusText}): ${formatPayloadForError(payload)}`,
        );
    }
}
