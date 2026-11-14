export interface ComponentEnabledState {
    persistedEnabled?: unknown;
    defaultEnabled?: boolean;
    locked?: boolean;
}

/**
 * Resolves persisted power state without allowing locked components to remain
 * disabled after their lifecycle policy becomes mandatory.
 */
export function resolveComponentEnabledState({
    persistedEnabled,
    defaultEnabled = false,
    locked = false,
}: ComponentEnabledState): boolean {
    if (locked) return true;
    if (
        persistedEnabled === true ||
        persistedEnabled === 1 ||
        persistedEnabled === "1" ||
        persistedEnabled === "true"
    ) {
        return true;
    }
    if (
        persistedEnabled === false ||
        persistedEnabled === 0 ||
        persistedEnabled === "0" ||
        persistedEnabled === "false"
    ) {
        return false;
    }
    return defaultEnabled;
}
