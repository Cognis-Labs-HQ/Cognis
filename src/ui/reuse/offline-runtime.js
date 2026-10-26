/**
 * Registers the host's offline policy, queued delivery flows and recovery hooks.
 * Public exports: registerOfflineRuntime — install the runtime on a browser ctx.
 * @example registerOfflineRuntime(uiCtx);
 * @param {object} ctx Browser flow and capability context.
 * @returns {void}
 */
import { offlinePolicy } from "./offline-policy.js";
import { createOfflineOutbox } from "./offline-outbox.js";
import {
    isOffline,
    offlineEnabled,
    offlineWorkerRequest,
} from "./offline-state.js";

export function registerOfflineRuntime(ctx) {
    if (ctx.capabilities.get("offline:outbox")) return;
    const outbox = createOfflineOutbox({
        identity: () => ({
            account: globalThis.localStorage?.getItem("cognis_account"),
            session: globalThis.localStorage?.getItem("cognis_access_token"),
        }),
        enabled: offlineEnabled,
        offline: isOffline,
        allowed: offlinePolicy.allows,
        changed: () =>
            globalThis.window?.dispatchEvent(
                new CustomEvent("cognis:offline-buffer-changed"),
            ),
    });
    let verifiedSession;
    let retrySession;
    let retryTimer;
    const sessionIdentity = () =>
        JSON.stringify([
            globalThis.localStorage?.getItem("cognis_account"),
            globalThis.localStorage?.getItem("cognis_access_token"),
        ]);
    const scheduleRetry = () => {
        if (
            retryTimer ||
            isOffline() ||
            typeof globalThis.window?.addEventListener !== "function" ||
            !retrySession
        )
            return;
        retryTimer = setTimeout(async () => {
            retryTimer = null;
            if (isOffline() || retrySession !== sessionIdentity()) return;
            try {
                if (!(await outbox.hasPending())) return;
                await ctx.runFlow("authenticate-session", {});
                if (await outbox.hasPending()) scheduleRetry();
            } catch (error) {
                console.error("[offline] queued delivery retry failed", {
                    operation: "retryOutbox",
                    errorName: error?.name,
                });
                scheduleRetry();
            }
        }, 15_000);
    };
    ctx.capabilities.contribute("offline:accessPolicy", offlinePolicy);
    ctx.capabilities.contribute("offline:state", {
        isOffline,
        enabled: offlineEnabled,
    });
    ctx.capabilities.contribute("offline:outbox", {
        register: outbox.register,
        pending: outbox.pending,
        hasBufferedChanges: outbox.hasBufferedChanges,
        submit: async (owner, id, payload) =>
            (await ctx.runFlow("offline:enqueue", { owner, id, payload })).data
                .result,
        flush: async () => (await ctx.runFlow("offline:flush", {})).data.result,
    });
    ctx.registerFlow("offline:enqueue", ["persist"]);
    ctx.extendFlow(
        "offline:enqueue",
        "persist",
        { id: "ui:enqueueOutbox" },
        async ({ input, data }) => {
            data.result = await outbox.submit(
                input.owner,
                input.id,
                input.payload,
            );
        },
    );
    ctx.registerFlow("offline:flush", ["authorize", "deliver"]);
    ctx.extendFlow(
        "offline:flush",
        "authorize",
        { id: "ui:authorizeOfflineDelivery" },
        ({ data }) => {
            data.authorized = Boolean(
                verifiedSession &&
                verifiedSession === sessionIdentity() &&
                !isOffline() &&
                offlinePolicy.allows(),
            );
        },
    );
    ctx.extendFlow(
        "offline:flush",
        "deliver",
        { id: "ui:flushOutbox" },
        async ({ data }) => {
            data.result = data.authorized
                ? await outbox.flush()
                : { sent: 0, rejected: 0 };
        },
    );
    ctx.extendFlow(
        "authenticate-session",
        "beforeSession",
        { id: "ui:invalidateOfflineVerification", order: -1000 },
        () => {
            verifiedSession = undefined;
        },
    );
    const deliverAfterAuthentication = async (actor) => {
        try {
            if (
                !(await outbox.hasPending()) ||
                actor !== verifiedSession ||
                actor !== sessionIdentity()
            )
                return;
            const result = await ctx.runFlow("offline:flush", {});
            if (result.data.result?.rejected && globalThis.document) {
                const { createI18n } = await import("./i18n.js");
                const i18n = await createI18n();
                if (actor !== sessionIdentity()) return;
                ctx.capabilities.get("ui:showToast")?.(
                    i18n.t("ui.reuse.offline_sync_rejected"),
                    { variant: "warning" },
                );
            }
        } catch (error) {
            console.error("[offline] queued delivery could not start", {
                operation: "flushOutbox",
                errorName: error?.name,
            });
        }
        try {
            if (
                actor === verifiedSession &&
                actor === sessionIdentity() &&
                (await outbox.hasPending())
            )
                scheduleRetry();
        } catch (error) {
            console.error("[offline] queued delivery state could not be read", {
                operation: "readOutbox",
                errorName: error?.name,
            });
        }
    };
    ctx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id: "ui:deliverOfflineActivity", order: 1000 },
        ({ stageResults }) => {
            if (
                !isOffline() &&
                stageResults["resolve-session"]?.some(
                    (result) => result?.authenticated,
                )
            ) {
                verifiedSession = sessionIdentity();
                retrySession = verifiedSession;
                void deliverAfterAuthentication(verifiedSession);
                return { scheduled: true };
            }
        },
    );
    ctx.extendFlow(
        "logout",
        "clearSession",
        { id: "ui:clearOfflineOutbox", order: -1000 },
        async () => {
            verifiedSession = undefined;
            retrySession = undefined;
            clearTimeout(retryTimer);
            retryTimer = null;
            try {
                await outbox.clear();
            } catch (error) {
                console.error("[offline] queued activity cleanup failed", {
                    operation: "clearOutbox",
                    errorName: error?.name,
                });
            }
        },
    );
    if (typeof globalThis.window?.addEventListener !== "function") return;
    window.addEventListener("cognis:connection-restoring", (event) =>
        event.detail.waitUntil(
            (async () => {
                await ctx.capabilities.get("ui:ensureProvidersLoaded")?.({
                    force: true,
                });
                await ctx.runFlow("authenticate-session", {});
            })(),
        ),
    );
    window.addEventListener("beforeunload", (event) => {
        if (!outbox.hasBufferedChanges()) return;
        event.preventDefault();
        event.returnValue = "";
    });
    window.addEventListener("cognis:offline-buffer-changed", () => {
        if (outbox.hasBufferedChanges()) scheduleRetry();
        else {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    });
    let blocker;
    let dismissBlocker;
    let lastPolicySync;
    const syncAccess = () => {
        const worker = globalThis.navigator?.serviceWorker?.controller;
        const allowed = offlinePolicy.allows();
        if (
            lastPolicySync &&
            lastPolicySync.worker === worker &&
            lastPolicySync.allowed === allowed
        )
            return;
        const sync = { worker, allowed };
        lastPolicySync = sync;
        void offlineWorkerRequest("COGNIS_OFFLINE_ACCESS", {
            allowed,
        }).catch((error) => {
            if (lastPolicySync === sync) lastPolicySync = undefined;
            console.error("[offline] worker policy sync failed", {
                operation: "syncAccess",
                errorName: error?.name,
                code: error?.message,
                workerState: worker?.state,
            });
        });
    };
    globalThis.navigator?.serviceWorker?.addEventListener?.(
        "controllerchange",
        syncAccess,
    );
    window.addEventListener("cognis:offline-worker-reset", () => {
        lastPolicySync = undefined;
        syncAccess();
    });
    const updatePolicy = async () => {
        syncAccess();
        if (!isOffline() && offlinePolicy.allows()) dismissBlocker?.();
        if (
            !isOffline() ||
            offlinePolicy.allows() ||
            blocker ||
            typeof globalThis.document?.querySelector !== "function"
        )
            return;
        blocker = (async () => {
            const [{ openPopup }, { createI18n }] = await Promise.all([
                import("./popup.js"),
                import("./i18n.js"),
            ]);
            const i18n = await createI18n();
            if (!isOffline() || offlinePolicy.allows()) return;
            await openPopup({
                title: i18n.t("ui.reuse.offline_access_required"),
                body: i18n.t("ui.reuse.offline_access_required_body"),
                mandatory: true,
                actions: [
                    {
                        id: "retry",
                        label: i18n.t("ui.reuse.retry"),
                        variant: "neutral",
                    },
                ],
                onAction: () => !isOffline() && offlinePolicy.allows(),
                onOpen: (_overlay, dismiss) => {
                    dismissBlocker = dismiss;
                },
            });
        })().finally(() => {
            blocker = null;
            dismissBlocker = null;
        });
        await blocker;
    };
    for (const event of [
        "cognis:offline-policy-changed",
        "cognis:connectivity-changed",
    ])
        window.addEventListener(event, () => {
            void updatePolicy().catch((error) =>
                console.error("[offline] access policy update failed", {
                    operation: "updatePolicy",
                    errorName: error?.name,
                }),
            );
        });
    queueMicrotask(() => {
        void updatePolicy().catch((error) =>
            console.error("[offline] initial access policy check failed", {
                operation: "initializePolicy",
                errorName: error?.name,
            }),
        );
    });
}
