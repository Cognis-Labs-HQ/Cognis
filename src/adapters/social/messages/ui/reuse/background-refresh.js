import { showToast } from "/static/reuse/toast.js";

export function createBackgroundRefresh({ captureRoom, run, i18n, operation }) {
    let pending = null;
    let lastOwner = null;
    let failureReported = false;
    const log = (message, error) =>
        console.error(message, {
            component: "social-messages",
            operation,
            errorName: error.name,
        });

    return function refresh() {
        if (pending?.isCurrent()) return pending.promise;
        const isCurrent = captureRoom();
        if (!isCurrent()) return Promise.resolve();
        if (!lastOwner?.()) failureReported = false;
        lastOwner = isCurrent;
        const promise = (async () => {
            try {
                await run(isCurrent);
                if (isCurrent()) failureReported = false;
            } catch (error) {
                if (!isCurrent()) return;
                log("[messages] background refresh failed", error);
                if (!failureReported) {
                    failureReported = true;
                    showToast(i18n.t("module.social.messages.update_failed"), {
                        variant: "error",
                    });
                }
            }
        })().finally(() => {
            if (pending?.promise === promise) pending = null;
        });
        pending = { isCurrent, promise };
        return promise;
    };
}
