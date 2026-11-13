import type { BootstrapLog } from "../../shared.js";
export function logRejectedDeliveries(input: {
    results: PromiseSettledResult<unknown>[];
    recipients: string[];
    log?: BootstrapLog;
    message: string;
    operation: string;
    shareId: string;
}): void {
    input.results.forEach((result, index) => {
        if (result.status !== "rejected") {
            return;
        }
        input.log?.("error", input.message, {
            component: "share-gateway",
            operation: input.operation,
            shareId: input.shareId,
            recipientUsername: input.recipients[index],
            error:
                result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason),
        });
    });
}
