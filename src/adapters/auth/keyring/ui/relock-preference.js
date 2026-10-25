export function createRelockPreference({
    getVaultData,
    getStorageKey,
    persistVault,
    scheduleRelock,
}) {
    function getMinutes() {
        const key = getStorageKey();
        if (!key) return 0;
        const stored = localStorage.getItem(key);
        if (stored !== null) return Math.max(0, Number(stored) || 0);
        return Math.max(
            0,
            Number(getVaultData()?.preferences?.relockMinutes ?? 0),
        );
    }

    async function setMinutes(minutes) {
        const normalizedMinutes = Math.max(0, Number(minutes) || 0);
        const key = getStorageKey();
        if (!key) throw new Error("keyring_identity_unverified");
        localStorage.setItem(key, String(normalizedMinutes));
        const vaultData = getVaultData();
        if (vaultData) {
            vaultData.preferences ??= {};
            vaultData.preferences.relockMinutes = normalizedMinutes;
            await persistVault();
            scheduleRelock({ resetDeadline: true });
        }
    }

    return { getMinutes, setMinutes };
}
