const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

export function resolveMaxFileBytes(getMaxFileBytes?: () => number): number {
    const candidate = Number(getMaxFileBytes?.() ?? DEFAULT_MAX_FILE_BYTES);
    if (!Number.isFinite(candidate) || candidate <= 0) {
        return DEFAULT_MAX_FILE_BYTES;
    }
    return Math.floor(candidate);
}
