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
