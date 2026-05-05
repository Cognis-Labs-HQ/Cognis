import { randomBytes } from "node:crypto";
import type { AuthContext } from "@cognis/core";
import type { LocalAccountStore } from "../../../api/adapters/local-auth-gateway.js";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";

export interface LocalAuthAdapter extends AuthProviderAdapter {
    register(
        username: string,
        password: string,
        isAdmin?: boolean,
    ): Promise<{ username: string; isAdmin: boolean; enabled: boolean }>;
    updateLastLogin(username: string): Promise<void>;
    store: LocalAccountStore;
}

class LocalAuthAdapterImpl implements LocalAuthAdapter {
    readonly id = "local";
    readonly name = "Local";
    readonly store: LocalAccountStore;

    constructor(store: LocalAccountStore) {
        this.store = store;
    }

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const username = String(credentials.username ?? "");
        const password = String(credentials.password ?? "");
        if (!username || !password) return null;
        return this.store.verify(username, password);
    }

    getConfigSchema(): AuthConfigField[] {
        return [];
    }

    configure(_config: Record<string, unknown>): void {
        // Local adapter has no configurable fields
    }

    async register(
        username: string,
        password: string,
        isAdmin = false,
    ): Promise<{ username: string; isAdmin: boolean; enabled: boolean }> {
        return this.store.register(username, password, isAdmin);
    }

    async updateLastLogin(username: string): Promise<void> {
        return this.store.updateLastLogin(username);
    }
}

export function createAdapter(store: LocalAccountStore): LocalAuthAdapter {
    return new LocalAuthAdapterImpl(store);
}

export function generatePassword(): string {
    return randomBytes(12).toString("base64url");
}
