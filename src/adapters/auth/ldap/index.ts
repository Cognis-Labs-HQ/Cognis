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
                reason: "LDAP writeback is disabled in adapter settings.",
            };
        }
        if (!this.writebackBaseDn) {
            return {
                supported: false,
                reason: "LDAP writeback base DN is not configured.",
            };
        }
        if (!this.client || typeof this.client.updatePassword !== "function") {
            return {
                supported: false,
                reason: "LDAP writeback client is unavailable.",
            };
        }
        return { supported: true };
    }

    async resetPassword(
        accountId: string,
        nextPassword: string,
    ): Promise<{ updated: boolean; message?: string }> {
        const support = this.getPasswordResetSupport();
        if (!support.supported) {
            return { updated: false, message: support.reason };
        }
        if (!this.client || typeof this.client.updatePassword !== "function") {
            return {
                updated: false,
                message: "LDAP writeback client is unavailable.",
            };
        }
        const updated = await this.client.updatePassword(
            accountId,
            nextPassword,
            {
                baseDn: this.writebackBaseDn,
                userAttribute: this.writebackUserAttribute,
            },
        );
        return updated
            ? { updated: true }
            : { updated: false, message: "LDAP password writeback failed." };
    }

    setClient(client: LdapClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new LdapAuthAdapter();
}
