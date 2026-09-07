import { getFirstMatchingStageResult } from "../../../api/reuse/flow-helpers.js";

export type ShareAccessResult = {
    allowed?: boolean;
    reason?: string;
    directAccess?: boolean;
};

export function resolveShareAccessResult(
    stageResults: Record<string, unknown[]> | undefined,
): ShareAccessResult | null {
    return (
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) =>
                (result as ShareAccessResult)?.allowed === true &&
                (result as ShareAccessResult)?.directAccess === true,
        ) as ShareAccessResult | null) ??
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) => (result as ShareAccessResult)?.allowed === true,
        ) as ShareAccessResult | null) ??
        (getFirstMatchingStageResult(
            stageResults,
            "check-access",
            (result) => (result as ShareAccessResult)?.allowed === false,
        ) as ShareAccessResult | null)
    );
}

export function shareRecipientsAllowRequester(
    tokenRecord: {
        ownerAccountId?: unknown;
        accessControls?: { recipients?: unknown };
    },
    requesterClaims: { sub?: unknown } | null | undefined,
): boolean {
    const recipients = tokenRecord?.accessControls?.recipients;
    if (!Array.isArray(recipients) || recipients.length === 0) return true;
    const requesterId = String(requesterClaims?.sub ?? "").trim();
    if (!requesterId) return false;
    if (requesterId === String(tokenRecord.ownerAccountId ?? "")) return true;
    return recipients.some((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const recipient = entry as { type?: unknown; id?: unknown };
        return (
            String(recipient.type ?? "") === "user" &&
            String(recipient.id ?? "") === requesterId
        );
    });
}
