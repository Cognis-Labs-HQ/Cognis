import {
    isOffline,
    offlineEnabled,
    offlineCacheGeneration,
} from "./offline-state.js";

/** Refresh an owner's lightweight snapshots after verified authentication and cache invalidation. */
export function bindOfflineSnapshotRefresh(ctx, { id, refresh }) {
    ctx.signal.throwIfAborted();
    let prepared;
    let authenticated = false;
    let active = false;
    let repeat = false;
    const warm = async () => {
        const actor = JSON.stringify([
            localStorage.getItem("cognis_account"),
            localStorage.getItem("cognis_access_token"),
            offlineCacheGeneration(),
            localStorage.getItem("cognis_session_expires_at"),
        ]);
        if (
            !authenticated ||
            !offlineEnabled() ||
            isOffline() ||
            ctx.signal.aborted ||
            prepared === actor
        )
            return;
        if (active) {
            repeat = true;
            return;
        }
        active = true;
        prepared = actor;
        try {
            await refresh();
        } catch (error) {
            if (prepared === actor) prepared = undefined;
            console.info("[offline] snapshot not prepared", {
                operation: id,
                errorName: error?.name,
            });
        } finally {
            active = false;
            if (repeat) {
                repeat = false;
                void warm();
            }
        }
    };
    for (const type of [
        "cognis:offline-preference-changed",
        "cognis:offline-worker-reset",
        "cognis:module-lifecycle-changed",
    ])
        globalThis.window?.addEventListener(
            type,
            () => {
                prepared = undefined;
                void warm();
            },
            { signal: ctx.signal },
        );
    ctx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id },
        ({ stageResults }) => {
            authenticated =
                stageResults["resolve-session"]?.some(
                    (result) => result?.authenticated === true,
                ) === true;
            if (authenticated) void warm();
        },
    );
}
