/** Retire persisted decryption keys; encrypted vaults remain cached independently. */
export async function retireSessionUnlockCache() {
    if (typeof globalThis.indexedDB?.deleteDatabase !== "function") return;
    await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase("cognis-keyring-session");
        request.onsuccess = resolve;
        request.onblocked = resolve;
        request.onerror = resolve;
    });
}
