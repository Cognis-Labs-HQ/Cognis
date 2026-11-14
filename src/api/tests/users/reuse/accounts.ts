import type { LocalAccountStore } from "@cognis/core";

type Account = NonNullable<Awaited<ReturnType<LocalAccountStore["getInfo"]>>>;
type AccountRole = Parameters<LocalAccountStore["setRole"]>[1];

/** Public account-store fixture with observable calls and no Auth implementation. */
export class TestAccountStore implements LocalAccountStore {
    readonly calls: string[] = [];
    private readonly accounts = new Map<string, Account>();

    async register(
        username: string,
        _password: string,
        role: AccountRole = "user",
    ) {
        if (this.accounts.has(username)) throw new Error("account_exists");
        this.accounts.set(username, {
            username,
            enabled: true,
            isFounder: false,
            role,
            provider: "local",
            createdAt: new Date().toISOString(),
            lastLogin: null,
        });
        this.calls.push("register");
        return { username, enabled: true, role };
    }

    async ensureExternalAccount(identity: {
        accountId: string;
        provider: string;
        externalUserId: string;
    }) {
        await this.register(identity.accountId, "unused");
        this.require(identity.accountId).provider = identity.provider;
        return identity.accountId;
    }

    async verify(): Promise<never> {
        throw new Error("authentication_not_supported_by_fixture");
    }

    async has(username: string) {
        return this.accounts.has(username);
    }

    async exists(username: string) {
        return this.accounts.has(username);
    }

    async list() {
        this.calls.push("list");
        return [...this.accounts.values()].map((account) => ({
            ...account,
            accountId: account.username,
        }));
    }

    async getInfo(username: string) {
        this.calls.push("getInfo");
        const account = this.accounts.get(username);
        return account ? { ...account } : null;
    }

    async setRole(username: string, role: AccountRole) {
        this.calls.push("setRole");
        this.require(username).role = role;
    }

    async setPassword(username: string, _password: string) {
        this.calls.push("setPassword");
        this.require(username);
    }

    async setEnabled(username: string, enabled: boolean) {
        this.calls.push("setEnabled");
        this.require(username).enabled = enabled;
    }

    async setFounder(username: string, isFounder: boolean) {
        this.calls.push("setFounder");
        this.require(username).isFounder = isFounder;
    }

    async isFounder(username: string) {
        return this.require(username).isFounder;
    }

    async updateLastLogin(username: string) {
        this.require(username).lastLogin = new Date().toISOString();
    }

    async getDisplayName(username: string) {
        return this.accounts.has(username) ? username : null;
    }

    async delete(username: string) {
        this.calls.push("delete");
        this.accounts.delete(username);
    }

    private require(username: string): Account {
        const account = this.accounts.get(username);
        if (!account) throw new Error("account_not_found");
        return account;
    }
}
