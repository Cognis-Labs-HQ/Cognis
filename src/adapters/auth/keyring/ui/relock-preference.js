import { relockStorageKey } from "./storage-keys.js";

export function createRelockPreference({
    getVaultData,
    persistVault,
    scheduleRelock,
}) {
    function getMinutes() {
        const stored = localStorage.getItem(relockStorageKey());
        if (stored !== null) return Math.max(0, Number(stored) || 0);
        return Math.max(
            0,
            Number(getVaultData()?.preferences?.relockMinutes ?? 0),
        );
    }

    async function setMinutes(minutes) {
        const normalizedMinutes = Math.max(0, Number(minutes) || 0);
        localStorage.setItem(relockStorageKey(), String(normalizedMinutes));
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
