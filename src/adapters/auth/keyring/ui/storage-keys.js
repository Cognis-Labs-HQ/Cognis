const STORAGE_KEY = "cognis_secure_keyring";
const RELOCK_STORAGE_KEY = "cognis_secure_keyring_relock_minutes";

function accountStorageKey(baseKey) {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    return accountId ? `${baseKey}:${encodeURIComponent(accountId)}` : baseKey;
}

export function keyringStorageKey() {
    return accountStorageKey(STORAGE_KEY);
}

export function relockStorageKey() {
    return accountStorageKey(RELOCK_STORAGE_KEY);
}

export { STORAGE_KEY };
