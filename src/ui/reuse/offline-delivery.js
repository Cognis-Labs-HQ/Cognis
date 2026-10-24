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
import { isOffline, offlineEnabled } from "./offline-state.js";

export async function deliverOrQueue(ctx, owner, id, payload, send) {
    if (!isOffline()) {
        try {
            return await send(payload);
        } catch (error) {
            if (
                !offlineEnabled() ||
                !isOffline() ||
                (error?.status && error.status < 500)
            )
                throw error;
        }
    }
    const outbox = ctx.capabilities.get("offline:outbox");
    if (!outbox) throw new Error("offline_delivery_unavailable");
    return outbox.submit(owner, id, payload);
}
