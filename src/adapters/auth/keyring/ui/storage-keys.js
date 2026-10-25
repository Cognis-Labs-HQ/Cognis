/** Browser artifacts are partitioned by verified origin, account and account instance. */
export function keyringStorageKeys(binding) {
    if (
        !binding?.origin ||
        !binding.accountId ||
        !binding.accountInstanceId ||
        !binding.sessionId
    )
        throw new Error("keyring_identity_unverified");
    const owner = encodeURIComponent(
        JSON.stringify([
            binding.origin,
            binding.accountId,
            binding.accountInstanceId,
        ]),
    );
    return {
        vault: `cognis_secure_keyring:${owner}`,
        relock: `cognis_secure_keyring_relock_minutes:${owner}`,
        deferred: `cognis_keyring_setup_pending:${owner}`,
        session: `${owner}:${binding.sessionId}`,
    };
}
