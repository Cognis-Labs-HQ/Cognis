import {
    dispatchKeyringEvent,
    showKeyringLifecycleToast,
} from "./lifecycle-notifications.js";
import { loadKeyringI18n } from "./resources.js";

export const MAX_ACTIVITY_EVENTS = 1000;
export const MAX_ACTIVITY_BYTES = 64 * 1024;

/** Retain recent activity within a separate budget without touching secrets. */
export function boundedKeyringActivity(events = []) {
    const retained = [];
    const encoder = new TextEncoder();
    let bytes = 2;
    for (const event of events.slice(-MAX_ACTIVITY_EVENTS).reverse()) {
        const size = encoder.encode(JSON.stringify(event)).byteLength;
        const separator = retained.length ? 1 : 0;
        if (bytes + size + separator > MAX_ACTIVITY_BYTES) continue;
        bytes += size + separator;
        retained.push(event);
    }
    return retained.reverse();
}

async function reportSyncFailure(error) {
    console.error({
        component: "auth-keyring-adapter",
        operation: "activity_sync",
        code: "keyring_sync_failed",
        status: error?.status,
    });
    await showKeyringLifecycleToast(
        "adapter.auth.keyring.sync_failed",
        "error",
        loadKeyringI18n,
    );
}

/** Coalesce background activity writes, including changes during an in-flight save. */
export function createActivityPersistence({
    persist,
    getStateVersion,
    isUnlocked,
    onError = reportSyncFailure,
}) {
    let pending = null;
    let revision = 0;
    const save = () => {
        revision += 1;
        if (pending) return pending;
        const expectedRevision = revision;
        const stateVersion = getStateVersion();
        pending = persist()
            .catch(onError)
            .catch(() =>
                console.error({
                    component: "auth-keyring-adapter",
                    operation: "activity_sync",
                    code: "keyring_sync_failed",
                }),
            )
            .finally(() => {
                pending = null;
                if (
                    isUnlocked() &&
                    stateVersion === getStateVersion() &&
                    expectedRevision !== revision
                )
                    save();
            });
        return pending;
    };
    return save;
}

export function recordKeyringActivity(vault, type, identifier = "") {
    if (!vault) return;
    vault.events = boundedKeyringActivity([
        ...(vault.events ?? []),
        {
            type: String(type),
            identifier: String(identifier),
            timestamp: new Date().toISOString(),
        },
    ]);
    dispatchKeyringEvent(type, identifier);
}
