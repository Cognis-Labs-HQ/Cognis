export function createMessageActionOwner({ isActive, captureOwner, signal }) {
    let pending = null;

    function invalidate() {
        pending?.controller.abort();
        pending = null;
    }

    signal?.addEventListener("abort", invalidate, { once: true });

    function begin(validate = () => true) {
        if (!isActive() || signal?.aborted) return null;
        if (pending?.current()) return null;
        const ownsView = captureOwner();
        const controller = new AbortController();
        const action = {
            controller,
            signal: controller.signal,
            current() {
                const current =
                    pending === action &&
                    !controller.signal.aborted &&
                    isActive() &&
                    ownsView() &&
                    validate();
                if (!current && pending === action) invalidate();
                return current;
            },
            finish() {
                controller.abort();
                if (pending === action) pending = null;
            },
        };
        pending = action;
        if (!action.current()) return null;
        return action;
    }

    return { begin, invalidate };
}
