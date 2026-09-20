import type { AuthContext } from "./auth-gateway.js";

export interface LocalAccountStore {
    ensureExternalAccount?(identity: {
        accountId: string;
        accountNamespace?: string;
        provider: string;
        externalUserId: string;
        email?: string;
        displayName?: string;
        role?: string;
    }): Promise<string>;
    resolveExternalAccountId?(
        provider: string,
        externalUserId: string,
    ): Promise<string | null>;
    isExternalIdentityDeleted?(
        provider: string,
        externalUserId: string,
    ): Promise<boolean>;
    register(
        username: string,
        password: string,
        role?: "user" | "teacher" | "moderator" | "admin",
        displayName?: string,
    ): Promise<{
        username: string;
        enabled: boolean;
        role: string;
    }>;
    verify(username: string, password: string): Promise<AuthContext | null>;
    has(username: string): Promise<boolean>;
    list(): Promise<
        Array<{
            username: string;
            enabled: boolean;
            isFounder: boolean;
            role?: string;
            provider?: string;
        }>
    >;
    setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ): Promise<void>;
    setPassword(username: string, password: string): Promise<void>;
    setEnabled(username: string, enabled: boolean): Promise<void>;
    delete(
        username: string,
        options?: { recordExternalIdentityDeletion?: boolean },
    ): Promise<void>;
    getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
        enabled: boolean;
        isFounder: boolean;
        role?: string;
        provider?: string;
    } | null>;
    updateLastLogin(username: string): Promise<void>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    exists(username: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
}
