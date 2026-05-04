import type { AuthContext, AuthGateway, AuthAccountStore } from "@cognis/core";

export interface OidcTokenClaims {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
}

export interface OidcClient {
    introspect(accessToken: string): Promise<OidcTokenClaims | null>;
}

export interface OidcAuthGatewayOptions {
    client: OidcClient;
    accountStore: AuthAccountStore;
    providerName?: string;
    adminRoles?: string[];
}

export class OidcAuthGateway implements AuthGateway {
    private readonly providerName: string;
    private readonly adminRoles: Set<string>;

    constructor(private readonly options: OidcAuthGatewayOptions) {
        this.providerName = options.providerName ?? "oidc-sso";
        this.adminRoles = new Set(options.adminRoles ?? ["admin"]);
    }

    async authenticate(token: string): Promise<AuthContext | null> {
        const claims = await this.options.client.introspect(token);
        if (!claims) {
            return null;
        }

        const isAdmin = (claims.roles ?? []).some((role) =>
            this.adminRoles.has(role),
        );
        const existing = await this.options.accountStore.findByExternalIdentity(
            this.providerName,
            claims.sub,
        );
        const account = existing
            ? await this.options.accountStore.updateExternalAccount(
                  existing.id,
                  {
                      provider: this.providerName,
                      externalUserId: claims.sub,
                      email: claims.email,
                      displayName: claims.name,
                      isAdmin,
                  },
              )
            : await this.options.accountStore.createExternalAccount({
                  provider: this.providerName,
                  externalUserId: claims.sub,
                  email: claims.email,
                  displayName: claims.name,
                  isAdmin,
              });

        return {
            accountId: account.id,
            provider: this.providerName,
            externalUserId: claims.sub,
            email: claims.email,
            isAdmin,
        };
    }

    async createLocalAdmin(): Promise<AuthContext> {
        throw new Error(
            "OIDC SSO adapter cannot create local admins directly.",
        );
    }
}
