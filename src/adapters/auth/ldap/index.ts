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
    updatePassword?(
        accountId: string,
        nextPassword: string,
        options?: {
            baseDn?: string;
            userAttribute?: string;
        },
    ): Promise<boolean>;
}

class LdapAuthAdapter implements AuthProviderAdapter {
    readonly id = "ldap";
    readonly name = "LDAP";

    private client: LdapClient | null = null;
    private adminGroups: Set<string> = new Set(["cognis-admins"]);
    private writebackEnabled = false;
    private writebackBaseDn = "";
    private writebackUserAttribute = "uid";

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
            {
                key: "writebackEnabled",
                label: "Enable LDAP Password Writeback",
                type: "boolean",
                required: false,
            },
            {
                key: "writebackBaseDn",
                label: "Writeback Base DN",
                type: "text",
                required: false,
            },
            {
                key: "writebackUserAttribute",
                label: "Writeback User Attribute",
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
        this.writebackEnabled = config.writebackEnabled === true;
        if (typeof config.writebackBaseDn === "string") {
            this.writebackBaseDn = config.writebackBaseDn.trim();
        }
        if (
            typeof config.writebackUserAttribute === "string" &&
            config.writebackUserAttribute.trim()
        ) {
            this.writebackUserAttribute = config.writebackUserAttribute.trim();
        }
    }

    getPasswordResetSupport(): { supported: boolean; reason?: string } {
        if (!this.writebackEnabled) {
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_disabled",
            };
        }
        if (!this.writebackBaseDn) {
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_base_dn_missing",
            };
        }
        if (!this.client || typeof this.client.updatePassword !== "function") {
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_client_unavailable",
            };
        }
        // Current-password validation would require a user bind/re-bind flow
        // using the submitted password, but this adapter is token-oriented and
        // only receives a writeback client contract (not direct credential-bind
        // primitives). To guarantee "validate current password first" semantics,
        // password changes stay disabled for LDAP until a dedicated validation
        // contract is introduced.
        return {
            supported: false,
            reason: "gateway.auth.security.ldap.current_password_validation_unavailable",
        };
    }

    async resetPassword(
        _accountId: string,
        _currentPassword: string,
        _nextPassword?: string,
    ): Promise<{ updated: boolean; message?: string }> {
        // Signature remains aligned with AuthProviderAdapter.resetPassword even
        // though LDAP password change is intentionally blocked.
        const support = this.getPasswordResetSupport();
        return {
            updated: false,
            message: support.reason,
        };
    }

    setClient(client: LdapClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new LdapAuthAdapter();
}
