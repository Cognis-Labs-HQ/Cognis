import type { AuthContext } from "@cognis/core";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";

export interface LdapIdentity {
    id: string;
    email?: string;
    groups?: string[];
}

export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}

class LdapAuthAdapter implements AuthProviderAdapter {
    readonly id = "ldap";
    readonly name = "LDAP";

    private client: LdapClient | null = null;
    private adminGroups: Set<string> = new Set(["cognis-admins"]);

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const accessToken = String(credentials.accessToken ?? "");
        if (!this.client || !accessToken) return null;
        const identity = await this.client.authenticate(accessToken);
        if (!identity) return null;
        const hasAdminRole = (identity.groups ?? []).some((g) =>
            this.adminGroups.has(g),
        );
        return {
            accountId: identity.id,
            provider: "ldap",
            externalUserId: identity.id,
            email: identity.email,
            role: hasAdminRole ? "admin" : "user",
        };
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            { key: "host", label: "LDAP Host", type: "text", required: true },
            { key: "port", label: "Port", type: "number", required: true },
            { key: "bindDn", label: "Bind DN", type: "text", required: true },
            {
                key: "bindPassword",
                label: "Bind Password",
                type: "password",
                required: true,
            },
            { key: "baseDn", label: "Base DN", type: "text", required: true },
            {
                key: "adminGroups",
                label: "Admin Groups (comma-separated)",
                type: "text",
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        if (typeof config.adminGroups === "string" && config.adminGroups) {
            this.adminGroups = new Set(
                config.adminGroups
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean),
            );
        }
    }

    setClient(client: LdapClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new LdapAuthAdapter();
}
