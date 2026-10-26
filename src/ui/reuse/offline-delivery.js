/**
 * Attempts a component action, retaining idempotent activity after connection loss.
 * Public exports: deliverOrQueue — send online or queue through the host outbox.
 * @example await deliverOrQueue(ctx, 'practice', attempt.id, input, send);
 * @param {object} ctx Browser capability context.
 * @param {string} owner Registered component delivery owner.
 * @param {string} id Stable operation identity.
 * @param {object} payload Non-secret queued activity.
 * @param {(payload: object) => Promise<unknown>} send Owning component transport.
 * @returns {Promise<unknown>} Server result or explicit queued result.
 */
import { captureAccountGuard } from "./offline-identity.js";
import { isOffline, offlineEnabled } from "./offline-state.js";

/**
 * Telemetry failures must not turn an already persisted user action into a failed write.
 * @returns {Promise<void>}
 */
export async function recordQueuedActivity(ctx, activity) {
    try {
        await ctx.runFlow("activity:record", activity);
    } catch (error) {
        console.error("[offline] queued activity recording failed", {
            operation: "recordQueuedActivity",
            errorName: error?.name,
        });
    }
}

export async function deliverOrQueue(ctx, owner, id, payload, send) {
    const assertAccount = captureAccountGuard();
    const outbox = ctx.capabilities.get("offline:outbox");
    let pending = outbox ? await outbox.pending(owner) : [];
    assertAccount();
    if (!isOffline() && pending.length && !offlineEnabled()) {
        await outbox.flush();
        pending = await outbox.pending(owner);
        assertAccount();
        if (pending.length) throw new Error("offline_delivery_pending");
    }
    if (!isOffline() && pending.length === 0) {
        try {
            const result = await send(payload);
            assertAccount();
            return result;
        } catch (error) {
            assertAccount();
            if (
                !offlineEnabled() ||
                !isOffline() ||
                (error?.status && error.status < 500)
            )
                throw error;
        }
    }
    if (!outbox) throw new Error("offline_delivery_unavailable");
    assertAccount();
    const result = await outbox.submit(owner, id, payload);
    assertAccount();
    return result;
}
