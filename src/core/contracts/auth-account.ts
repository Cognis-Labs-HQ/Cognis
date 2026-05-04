export interface AuthAccount {
    id: string;
    email?: string;
    displayName?: string;
    isAdmin?: boolean;
}

export interface ExternalIdentity {
    provider: string;
    externalUserId: string;
    email?: string;
    displayName?: string;
    isAdmin?: boolean;
}

export interface AuthAccountStore {
    findByExternalIdentity(
        provider: string,
        externalUserId: string,
    ): Promise<AuthAccount | null>;
    createExternalAccount(identity: ExternalIdentity): Promise<AuthAccount>;
    updateExternalAccount(
        accountId: string,
        identity: ExternalIdentity,
    ): Promise<AuthAccount>;
    createLocalAccount(input: {
        username: string;
        passwordHash: string;
        email?: string;
        isAdmin?: boolean;
    }): Promise<AuthAccount>;
}
