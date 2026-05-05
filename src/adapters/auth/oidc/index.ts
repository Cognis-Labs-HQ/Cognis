import type { AuthContext } from "@cognis/core";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";

export interface OidcTokenClaims {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
}

export interface OidcClient {
    introspect(accessToken: string): Promise<OidcTokenClaims | null>;
}

class OidcAuthAdapter implements AuthProviderAdapter {
    readonly id = "oidc";
    readonly name = "OIDC SSO";

    private client: OidcClient | null = null;
    private providerName = "oidc-sso";
    private adminRoles: Set<string> = new Set(["admin"]);

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const accessToken = String(credentials.accessToken ?? "");
        if (!this.client || !accessToken) return null;
        const claims = await this.client.introspect(accessToken);
        if (!claims) return null;
        const isAdmin = (claims.roles ?? []).some((r) =>
            this.adminRoles.has(r),
        );
        return {
            accountId: claims.sub,
            provider: this.providerName,
            externalUserId: claims.sub,
            email: claims.email,
            isAdmin,
        };
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "providerName",
                label: "Provider Name",
                type: "text",
                required: true,
            },
            {
                key: "clientId",
                label: "Client ID",
                type: "text",
                required: true,
            },
            {
                key: "clientSecret",
                label: "Client Secret",
                type: "password",
                required: true,
            },
            {
                key: "discoveryUrl",
                label: "Discovery URL",
                type: "text",
                required: true,
            },
            {
                key: "adminRoles",
                label: "Admin Roles (comma-separated)",
                type: "text",
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        if (typeof config.providerName === "string" && config.providerName) {
            this.providerName = config.providerName;
        }
        if (typeof config.adminRoles === "string" && config.adminRoles) {
            this.adminRoles = new Set(
                config.adminRoles
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean),
            );
        }
    }

    setClient(client: OidcClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new OidcAuthAdapter();
}
