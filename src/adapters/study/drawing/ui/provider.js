import { observeDrawingCard } from "/static/gateways/study/reuse/drawing-state.js";
import {
    openDrawingPad,
    loadDrawingPad,
} from "/static/gateways/study/reuse/drawing.js";

/** @returns {void} */
export function mountProvider(ctx) {
    ctx.capabilities
        .get("offline:assets")
        .register(
            [
                "/static/gateways/study/reuse/drawing.html",
                "/static/gateways/study/reuse/drawing.css",
                "/static/gateways/study/reuse/pronunciation.css",
                "/static/assets/reuse/icons/close-light.svg",
                "/static/assets/reuse/icons/close-dark.svg",
            ],
            { signal: ctx.signal },
        );
    const lifetime = (signal) =>
        AbortSignal.any([ctx.signal, ...(signal ? [signal] : [])]);
    const scopedAction = (action) => (payload) => {
        const signal = lifetime(payload.signal);
        signal.throwIfAborted();
        return action({
            ...payload,
            signal,
        });
    };
    ctx.capabilities.contribute(
        "study:drawing:open",
        scopedAction(openDrawingPad),
    );
    ctx.capabilities.contribute(
        "study:drawing:load",
        scopedAction(loadDrawingPad),
    );
    ctx.capabilities.contribute(
        "study:drawing:observe",
        (listener, { signal } = {}) =>
            observeDrawingCard(listener, { signal: lifetime(signal) }),
    );
}
