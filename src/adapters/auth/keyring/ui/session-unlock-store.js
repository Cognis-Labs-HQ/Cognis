export function createSessionUnlockStore({
    getAccountInstanceId,
    getSessionUnlockId,
    isTemporaryKeyring,
}) {
    const databaseName = "cognis-keyring-session";
    const storeName = "keys";
    const markerPrefix = "cognis_keyring_session_unlocked";
    const expiryPrefix = "cognis_keyring_session_expires_at";

    function markerKey() {
        return `${markerPrefix}:${encodeURIComponent(getSessionUnlockId())}`;
    }

    function expiryKey() {
        return `${expiryPrefix}:${encodeURIComponent(getSessionUnlockId())}`;
    }

    function openDatabase() {
        if (typeof indexedDB === "undefined") return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(storeName)) {
                    request.result.createObjectStore(storeName, {
                        keyPath: "id",
                    });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function clear() {
        sessionStorage.removeItem(markerKey());
        sessionStorage.removeItem(expiryKey());
        const database = await openDatabase().catch(() => null);
        if (!database) return;
        await new Promise((resolve) => {
            const transaction = database.transaction(storeName, "readwrite");
            transaction.objectStore(storeName).delete(getSessionUnlockId());
            transaction.oncomplete = resolve;
            transaction.onerror = resolve;
        });
        database.close();
    }

    async function write(key) {
        if (isTemporaryKeyring()) return;
        const database = await openDatabase().catch(() => null);
        if (!database) return;
        const written = await new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, "readwrite");
            transaction.objectStore(storeName).put({
                id: getSessionUnlockId(),
                key,
                accountInstanceId: getAccountInstanceId(),
            });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        }).catch(() => false);
        database.close();
        if (written) sessionStorage.setItem(markerKey(), "1");
    }

    async function read() {
        if (isTemporaryKeyring()) return null;
        if (sessionStorage.getItem(markerKey()) !== "1") {
            await clear();
            return null;
        }
        const database = await openDatabase().catch(() => null);
        if (!database) return null;
        const record = await new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, "readonly");
            const request = transaction
                .objectStore(storeName)
                .get(getSessionUnlockId());
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        }).catch(() => null);
        database.close();
        const accountInstanceId = getAccountInstanceId();
        if (
            record?.accountInstanceId &&
            accountInstanceId &&
            record.accountInstanceId !== accountInstanceId
        ) {
            await clear();
            return null;
        }
        return record?.key ?? null;
    }

    return {
        clear,
        expiryKey,
        read,
        write,
    };
}
