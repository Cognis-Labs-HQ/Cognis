/**
 * Buffers structured browser diagnostics until their gateway consumer is ready.
 * Public exports:
 * - log(level, message, meta) — publish an event without choosing its outputs.
 * - subscribeDiagnostics(handler) — exclusively consume buffered and future events.
 * @example
 * log('error', 'translation_bundle_load_failed', { component: 'core' });
 * @param {string} level Event severity.
 * @param {string} message Event identifier or diagnostic message.
 * @param {object} [meta] Safe structured context.
 * @param {...unknown} details Additional diagnostic context, normalized by the gateway.
 * @returns {Promise<boolean>} Whether the consumer accepted the event.
 */
const stateKey = Symbol.for("cognis.browserDiagnostics");
const state =
    globalThis[stateKey] ??
    (globalThis[stateKey] = {
        pending: [],
        handler: null,
    });
const MAX_PENDING_EVENTS = 128;

export function log(level, message, meta = {}, ...details) {
    const entry = { level, message, meta };
    if (details.length) entry.details = details;
    if (state.handler) return state.handler(entry);
    state.pending.push(entry);
    if (state.pending.length > MAX_PENDING_EVENTS) state.pending.shift();
    return Promise.resolve(false);
}

/**
 * Attaches the gateway consumer and drains the bounded startup buffer.
 * @param {(entry: object) => Promise<boolean>} handler Gateway event handler.
 * @returns {() => void} Release only this consumer's subscription.
 */
export function subscribeDiagnostics(handler) {
    if (state.handler)
        throw new Error("diagnostic_consumer_already_registered");
    state.handler = handler;
    for (const entry of state.pending.splice(0)) void handler(entry);
    return () => {
        if (state.handler === handler) state.handler = null;
    };
}
