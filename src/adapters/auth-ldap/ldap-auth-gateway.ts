import { createHash } from "node:crypto";
import type { AuthContext, AuthGateway, AuthAccountStore } from "@cognis/core";

export interface LdapIdentity {
    id: string;
    email?: string;
    groups?: string[];
}

export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}

export interface LdapAuthGatewayOptions {
    client: LdapClient;
    accountStore: AuthAccountStore;
    adminGroups?: string[];
}

export class LdapAuthGateway implements AuthGateway {
    private readonly adminGroups: Set<string>;

    constructor(private readonly options: LdapAuthGatewayOptions) {
        this.adminGroups = new Set(options.adminGroups ?? ["cognis-admins"]);
    }

    async authenticate(token: string): Promise<AuthContext | null> {
        const identity = await this.options.client.authenticate(token);
        if (!identity) {
            return null;
        }

        const isAdmin = (identity.groups ?? []).some((group) =>
            this.adminGroups.has(group),
        );
        const existing = await this.options.accountStore.findByExternalIdentity(
            "ldap",
            identity.id,
        );
        const account = existing
            ? await this.options.accountStore.updateExternalAccount(
                  existing.id,
                  {
                      provider: "ldap",
                      externalUserId: identity.id,
                      email: identity.email,
                      isAdmin,
                  },
              )
            : await this.options.accountStore.createExternalAccount({
                  provider: "ldap",
                  externalUserId: identity.id,
                  email: identity.email,
                  isAdmin,
              });

        return {
            accountId: account.id,
            provider: "ldap",
            externalUserId: identity.id,
            email: identity.email,
            isAdmin,
        };
    }

    async createLocalAdmin(
        username: string,
        password: string,
    ): Promise<AuthContext> {
        const passwordHash = createHash("sha256")
            .update(password)
            .digest("hex");
        const account = await this.options.accountStore.createLocalAccount({
            username,
            passwordHash,
            isAdmin: true,
        });

        return {
            accountId: account.id,
            provider: "local",
            externalUserId: username,
            email: account.email,
            isAdmin: true,
        };
    }
}
