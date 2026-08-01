import { randomBytes } from "node:crypto";
import type { AuthContext } from "@cognis/core";
import type { LocalAccountStore } from "./adapter.js";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";

export interface LocalAuthAdapter extends AuthProviderAdapter {
    register(
        username: string,
        password: string,
        role?: "user" | "teacher" | "moderator" | "admin",
    ): Promise<{ username: string; role?: string; enabled: boolean }>;
    updateLastLogin(username: string): Promise<void>;
    store: LocalAccountStore;
}

class LocalAuthAdapterImpl implements LocalAuthAdapter {
    readonly id = "local";
    readonly name = "Local";
    readonly version = "0.3.5";
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

    getPasswordResetSupport(): { supported: boolean } {
        return { supported: true };
    }

    getLoginUiCapabilities(): { forgotPassword: boolean } {
        return { forgotPassword: true };
    }

    async resetPassword(
        accountId: string,
        currentPassword: string,
        nextPassword?: string,
    ): Promise<{ updated: boolean; message?: string }> {
        if (!accountId || !currentPassword || !nextPassword) {
            return {
                updated: false,
                message: "gateway.auth.security.required",
            };
        }
        const currentCredentials = await this.store.verify(
            accountId,
            currentPassword,
        );
        if (!currentCredentials) {
            return {
                updated: false,
                message:
                    "gateway.auth.security.error.current_password_incorrect",
            };
        }
        try {
            await this.store.setPassword(accountId, nextPassword);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            return {
                updated: false,
                message,
            };
        }
        return { updated: true };
    }

    async register(
        username: string,
        password: string,
        role: "user" | "teacher" | "moderator" | "admin" = "user",
    ): Promise<{ username: string; role?: string; enabled: boolean }> {
        return this.store.register(username, password, role);
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
