/**
 * Local-authentication adapter for the Auth gateway.
 *
 * This file has two responsibilities:
 *
 * 1. Re-export the LocalAccountStore interface and its volatile test
 *    double from src/api/reuse/account-store.ts so that any code inside
 *    this adapter can import them with a short local path.
 *
 * 2. Provide LocalAuthGateway — a thin AuthGateway implementation that
 *    delegates credential checks to a LocalAccountStore.
 *
 * Cross-boundary note:
 *   src/api/reuse/account-store.ts is the canonical home for
 *   LocalAccountStore because the interface is consumed by API-layer route
 *   factories (auth routes, user routes) that cannot import directly from an
 *   adapter. This re-export is purely for convenience within this adapter
 *   directory and does not create a new cross-boundary dependency.
 *
 * Adding a new auth adapter?
 *   Create a sibling directory under src/adapters/auth/<adapter-id>/ and
 *   implement the AuthGateway interface (from @cognis/core). You do not need
 *   to touch this file.
 */
import { randomBytes } from "node:crypto";
import type { AuthContext, AuthGateway } from "@cognis/core";
export type { LocalAccountStore } from "../../../api/reuse/account-store.js";
export { VolatileLocalAccountStore } from "../../../api/reuse/account-store.js";
import type { LocalAccountStore } from "../../../api/reuse/account-store.js";

export class LocalAuthGateway implements AuthGateway {
    constructor(private readonly store: LocalAccountStore) {}

    async authenticate(token: string): Promise<AuthContext | null> {
        const payload = JSON.parse(token) as {
            username?: string;
            password?: string;
        };
        return this.store.verify(
            String(payload.username ?? ""),
            String(payload.password ?? ""),
        );
    }

    async createLocalAdmin(
        username: string,
        password: string,
    ): Promise<AuthContext> {
        if (!(await this.store.has(username)))
            await this.store.register(username, password, true);
        return {
            accountId: username,
            provider: "local",
            externalUserId: username,
            isAdmin: true,
        };
    }

    static generatePassword() {
        return randomBytes(12).toString("base64url");
    }
}
