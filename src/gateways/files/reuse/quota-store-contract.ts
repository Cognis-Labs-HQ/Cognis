/**
 * FileQuotaStore contract consumed by the files gateway's namespace file
 * service. The concrete DB-backed implementation lives in the file/quota
 * adapter (src/adapters/file/quota/) and is wired in during files gateway
 * bootstrap. Kept here (in the gateway's own reuse directory) rather than in
 * a generic api/reuse location because only the files gateway consumes it.
 */
export interface NamespaceQuotaDefaults {
    namespaceId: string;
    quotaBytes: number;
}

export interface UserQuotaSnapshot {
    namespaceId: string;
    quotaBytes: number;
}

export interface FileQuotaStore {
    /** Seed/refresh the default quota row for a namespace (admin-tunable). */
    ensureNamespaceDefault(
        namespaceId: string,
        quotaBytes: number,
    ): Promise<void>;
    listNamespaceDefaults(): Promise<NamespaceQuotaDefaults[]>;
    setNamespaceDefault(
        namespaceId: string,
        quotaBytes: number,
    ): Promise<void>;
    getGlobalDefault(): Promise<number>;
    setGlobalDefault(quotaBytes: number): Promise<void>;

    /**
     * Snapshots the current defaults into per-user rows for a newly created
     * account, "locking in" the quotas that prevailed at creation time.
     */
    provisionUser(username: string): Promise<void>;

    getUserNamespaceQuota(
        username: string,
        namespaceId: string,
    ): Promise<number | undefined>;
    setUserNamespaceQuota(
        username: string,
        namespaceId: string,
        quotaBytes: number,
    ): Promise<void>;
    listUserQuotas(username: string): Promise<UserQuotaSnapshot[]>;
    getUserGlobalQuota(username: string): Promise<number | undefined>;
    setUserGlobalQuota(username: string, quotaBytes: number): Promise<void>;
}
