import {
    getPendingLoginAttempt,
    cancelPendingLoginAttempt,
} from "../login-client.js";

export function createLoginContinuation({
    signal,
    apply,
    onError,
    onCancelled,
    onCancelFailed,
}) {
    let revision = 0;
    let currentAttemptId = null;
    let cancelling = false;
    const begin = () => {
        const expected = ++revision;
        return () => !signal?.aborted && revision === expected;
    };
    return {
        begin,
        isCancelling: () => cancelling,
        isAttemptCurrent(id) {
            return !signal?.aborted && !cancelling && currentAttemptId === id;
        },
        setAttempt(loginAttemptId) {
            currentAttemptId = loginAttemptId;
        },
        async resume() {
            if (cancelling || signal?.aborted) return;
            const isCurrent = begin();
            try {
                const data = await getPendingLoginAttempt({ signal });
                if (!isCurrent() || !data) return;
                currentAttemptId = data.loginAttemptId;
                await apply(data, isCurrent);
            } catch (error) {
                if (isCurrent()) onError(error);
            }
        },
        async cancel() {
            if (cancelling || !currentAttemptId || signal?.aborted) return;
            cancelling = true;
            begin();
            const expected = currentAttemptId;
            const isCurrent = () =>
                !signal?.aborted && currentAttemptId === expected;
            let failure = null;
            try {
                await cancelPendingLoginAttempt(expected, { signal });
                if (!isCurrent()) return;
                currentAttemptId = null;
                onCancelled();
            } catch (error) {
                failure = error;
            } finally {
                cancelling = false;
            }
            if (failure && isCurrent()) {
                const ownsPrompt = await onCancelFailed?.();
                if (isCurrent() && ownsPrompt !== false) onError(failure);
            }
        },
    };
}
