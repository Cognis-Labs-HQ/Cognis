/**
 * Persists server-declared offline requirements and account-scoped receipts.
 * Public exports: offlinePolicy — configure requirements, update receipts and check access.
 * @example offlinePolicy.configure(['legal']); offlinePolicy.allows();
 */
const REQUIREMENTS_KEY = "cognis_offline_requirements";
const RECEIPTS_KEY = "cognis_offline_receipts";
const policyKey = Symbol.for("cognis.offlinePolicy");

export function createOfflinePolicy({
    storage = () => globalThis.localStorage,
    notify = () => {},
} = {}) {
    let storageFailed = false;
    function read(key) {
        try {
            return JSON.parse(storage()?.getItem(key) ?? "null");
        } catch (error) {
            console.error("[offline] policy read failed", {
                operation: "readPolicy",
            });
            return null;
        }
    }
    function account() {
        return storage()?.getItem("cognis_account") ?? "";
    }
    function allows() {
        if (storageFailed) return false;
        const required = read(REQUIREMENTS_KEY);
        if (!Array.isArray(required)) return false;
        const receipts = read(RECEIPTS_KEY);
        return required.every(
            (id) =>
                receipts?.[id]?.account === account() &&
                receipts[id].allowed === true &&
                typeof receipts[id].revision === "string",
        );
    }
    return {
        allows,
        configure(ids) {
            if (
                !Array.isArray(ids) ||
                ids.length > 32 ||
                ids.some(
                    (id) =>
                        typeof id !== "string" ||
                        !/^[a-z0-9:._-]{1,160}$/.test(id),
                )
            )
                throw new Error("invalid_offline_requirements");
            try {
                storage()?.setItem(
                    REQUIREMENTS_KEY,
                    JSON.stringify([...new Set(ids)]),
                );
                storageFailed = false;
            } catch (error) {
                storageFailed = true;
                throw error;
            } finally {
                notify();
            }
        },
        update(id, { allowed, revision }) {
            if (typeof id !== "string" || !/^[a-z0-9:._-]{1,160}$/.test(id))
                throw new Error("invalid_offline_requirement");
            if (
                typeof allowed !== "boolean" ||
                typeof revision !== "string" ||
                revision.length > 4096
            )
                throw new Error("invalid_offline_receipt");
            const receipts = read(RECEIPTS_KEY) ?? {};
            receipts[id] = { account: account(), allowed, revision };
            try {
                storage()?.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
                storageFailed = false;
            } catch (error) {
                storageFailed = true;
                throw error;
            } finally {
                notify();
            }
        },
    };
}

export const offlinePolicy = (globalThis[policyKey] ??= createOfflinePolicy({
    notify: () => {
        if (typeof globalThis.CustomEvent === "function")
            globalThis.window?.dispatchEvent(
                new CustomEvent("cognis:offline-policy-changed"),
            );
    },
}));
