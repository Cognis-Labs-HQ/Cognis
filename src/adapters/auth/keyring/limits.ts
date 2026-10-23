export const DEFAULT_MAX_VAULT_BYTES = 2 * 1024 * 1024;
export const MAX_VAULT_BYTES = 8 * 1024 * 1024;

export function boundedVaultBytes(
    configured = DEFAULT_MAX_VAULT_BYTES,
): number {
    return Number.isFinite(configured) && configured > 0
        ? Math.min(Math.floor(configured), MAX_VAULT_BYTES)
        : DEFAULT_MAX_VAULT_BYTES;
}
