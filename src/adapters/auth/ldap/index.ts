import type { AuthContext, FlowApi } from "@cognis/core";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";
import { registerLdapFlowHooks } from "./flow-hooks.js";

export interface LdapIdentity {
    id: string;
    email?: string;
    groups?: string[];
    dn?: string;
    attributes?: Record<string, unknown>;
}

export interface LdapDirectorySample {
    users: Array<{
        id: string;
        dn?: string;
        email?: string;
        displayName?: string;
        groups?: string[];
        memberOf?: string[];
    }>;
    groups: Array<{ name: string; dn?: string; members?: string[] }>;
    supportsMemberOf: boolean;
    directoryFlavor: "openldap" | "freeipa" | "generic";
}

export interface LdapClient {
    authenticate(
        accessToken: string,
        options?: LdapRuntimeOptions,
    ): Promise<LdapIdentity | null>;
    testConnection?(
        options: LdapRuntimeOptions,
    ): Promise<boolean | LdapDirectorySample>;
    discover?(options: LdapRuntimeOptions): Promise<LdapDirectorySample>;
    validatePassword?(
        accountId: string,
        currentPassword: string,
        options?: { baseDn?: string; userAttribute?: string },
    ): Promise<boolean>;
    updatePassword?(
        accountId: string,
        nextPassword: string,
        options?: { baseDn?: string; userAttribute?: string },
    ): Promise<boolean>;
}

interface LdapRuntimeOptions {
    serverUrl: string;
    baseDn: string;
    bindDn: string;
    bindPassword: string;
    userFilter: string;
    groupFilter: string;
    userAttribute: string;
    groupNameAttribute: string;
    groupMemberAttribute: string;
    memberOfAttribute: string;
    nestedMemberOf: boolean;
    roleMappings: Record<string, string>;
}

function splitList(value: unknown): string[] {
    if (Array.isArray(value))
        return value
            .map(String)
            .map((v) => v.trim())
            .filter(Boolean);
    return String(value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}

function parseRoleMappings(value: unknown): Record<string, string> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .map(([k, v]) => [k.trim(), String(v).trim()])
                .filter(([k, v]) => k && v),
        );
    }
    const mappings: Record<string, string> = {};
    for (const item of splitList(value)) {
        const [group, role] = item.split(/[:=]/).map((part) => part?.trim());
        if (group && role) mappings[group] = role;
    }
    return mappings;
}

function defaultLdapSample(
    config: Partial<LdapRuntimeOptions>,
): LdapDirectorySample {
    const baseDn = config.baseDn || "dc=example,dc=org";
    const isFreeIpa =
        /cn=accounts/i.test(baseDn) || /freeipa/i.test(config.serverUrl ?? "");
    return {
        directoryFlavor: isFreeIpa ? "freeipa" : "openldap",
        supportsMemberOf: true,
        users: [
            {
                id: "alice",
                dn: `uid=alice,ou=People,${baseDn}`,
                email: "alice@example.org",
                displayName: "Alice Example",
                groups: ["teachers"],
                memberOf: [`cn=teachers,ou=Groups,${baseDn}`],
            },
            {
                id: "bob",
                dn: `uid=bob,ou=People,${baseDn}`,
                email: "bob@example.org",
                displayName: "Bob Example",
                groups: ["learners"],
                memberOf: [`cn=learners,ou=Groups,${baseDn}`],
            },
        ],
        groups: [
            {
                name: "cognis-admins",
                dn: `cn=cognis-admins,ou=Groups,${baseDn}`,
                members: ["alice"],
            },
            {
                name: "teachers",
                dn: `cn=teachers,ou=Groups,${baseDn}`,
                members: ["alice"],
            },
            {
                name: "learners",
                dn: `cn=learners,ou=Groups,${baseDn}`,
                members: ["bob"],
            },
        ],
    };
}

class LdapAuthAdapter implements AuthProviderAdapter {
    readonly id = "ldap";
    readonly name = "LDAP";
    readonly version = "0.2.0";

    private client: LdapClient | null = null;
    private adminGroups = new Set(["cognis-admins"]);
    private writebackEnabled = false;
    private writebackBaseDn = "";
    private writebackUserAttribute = "uid";
    private options: LdapRuntimeOptions = {
        serverUrl: "",
        baseDn: "",
        bindDn: "",
        bindPassword: "",
        userFilter: "(&(objectClass=inetOrgPerson)(uid={username}))",
        groupFilter:
            "(|(objectClass=groupOfNames)(objectClass=groupOfUniqueNames)(objectClass=posixGroup)(objectClass=ipaUserGroup))",
        userAttribute: "uid",
        groupNameAttribute: "cn",
        groupMemberAttribute: "member",
        memberOfAttribute: "memberOf",
        nestedMemberOf: true,
        roleMappings: { "cognis-admins": "admin" },
    };

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const accessToken = String(
            credentials.accessToken ?? credentials.password ?? "",
        );
        if (!this.client || !accessToken) return null;
        const identity = await this.client.authenticate(
            accessToken,
            this.options,
        );
        if (!identity) return null;
        const role = this.resolveRole(identity.groups ?? []);
        return {
            accountId: identity.id,
            provider: "ldap",
            externalUserId: identity.dn ?? identity.id,
            email: identity.email,
            role,
        };
    }

    private resolveRole(groups: string[]): string {
        for (const group of groups) {
            const mapped =
                this.options.roleMappings[group] ??
                this.options.roleMappings[group.toLowerCase()];
            if (mapped) return mapped;
        }
        return groups.some((g) => this.adminGroups.has(g)) ? "admin" : "user";
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "serverUrl",
                label: "LDAP Server URL",
                type: "text",
                required: true,
            },
            {
                key: "host",
                label: "LDAP Host (legacy)",
                type: "text",
                required: false,
            },
            { key: "baseDn", label: "Base DN", type: "text", required: true },
            { key: "bindDn", label: "Bind DN", type: "text", required: true },
            {
                key: "bindPassword",
                label: "Bind Password",
                type: "password",
                required: true,
            },
            {
                key: "userFilter",
                label: "User Filter",
                type: "text",
                required: true,
            },
            {
                key: "groupFilter",
                label: "Group Filter",
                type: "text",
                required: false,
            },
            {
                key: "nestedMemberOf",
                label: "Use nested memberOf",
                type: "boolean",
                required: false,
            },
            {
                key: "roleMappings",
                label: "LDAP group to Cognis role mappings",
                type: "text",
                required: false,
            },
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
        this.options = {
            ...this.options,
            ...Object.fromEntries(
                Object.entries(config).filter(
                    ([, v]) => typeof v !== "undefined",
                ),
            ),
        } as LdapRuntimeOptions;
        this.options.serverUrl = String(
            config.serverUrl ?? config.host ?? this.options.serverUrl ?? "",
        ).trim();
        this.options.roleMappings = parseRoleMappings(
            config.roleMappings ?? this.options.roleMappings,
        );
        if (typeof config.adminGroups === "string" && config.adminGroups)
            this.adminGroups = new Set(splitList(config.adminGroups));
        this.writebackEnabled = config.writebackEnabled === true;
        this.writebackBaseDn = String(
            config.writebackBaseDn ?? this.options.baseDn ?? "",
        ).trim();
        this.writebackUserAttribute =
            String(
                config.writebackUserAttribute ?? this.writebackUserAttribute,
            ).trim() || "uid";
    }

    async testConfiguration(
        config: Record<string, unknown>,
    ): Promise<LdapDirectorySample> {
        const merged = { ...this.options, ...config } as LdapRuntimeOptions;
        if (
            !merged.serverUrl ||
            !merged.baseDn ||
            !merged.bindDn ||
            !merged.bindPassword
        )
            throw new Error(
                "LDAP server URL, base DN, and bind credentials are required.",
            );
        if (this.client?.discover) return this.client.discover(merged);
        if (this.client?.testConnection) {
            const result = await this.client.testConnection(merged);
            if (result && typeof result === "object") return result;
            if (result === false)
                throw new Error("LDAP connection test failed.");
        }
        return defaultLdapSample(merged);
    }

    getPasswordResetSupport(): { supported: boolean; reason?: string } {
        if (!this.writebackEnabled)
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_disabled",
            };
        if (!this.writebackBaseDn)
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_base_dn_missing",
            };
        if (!this.client?.updatePassword)
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_client_unavailable",
            };
        if (!this.client.validatePassword)
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.current_password_validation_unavailable",
            };
        return { supported: true };
    }

    async resetPassword(
        accountId: string,
        currentPassword: string,
        nextPassword?: string,
    ): Promise<{ updated: boolean; message?: string }> {
        const support = this.getPasswordResetSupport();
        if (
            !support.supported ||
            !nextPassword ||
            !this.client?.validatePassword ||
            !this.client.updatePassword
        )
            return { updated: false, message: support.reason };
        const options = {
            baseDn: this.writebackBaseDn,
            userAttribute: this.writebackUserAttribute,
        };
        if (
            !(await this.client.validatePassword(
                accountId,
                currentPassword,
                options,
            ))
        )
            return {
                updated: false,
                message:
                    "gateway.auth.security.error.current_password_incorrect",
            };
        return {
            updated: await this.client.updatePassword(
                accountId,
                nextPassword,
                options,
            ),
        };
    }

    setClient(client: LdapClient): void {
        this.client = client;
    }
    registerFlowHooks(flow: FlowApi, options?: { enabled?: boolean }): void {
        registerLdapFlowHooks(flow, {
            getAvailability: () => ({
                id: this.id,
                name: this.name,
                enabled: options?.enabled === true,
            }),
        });
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new LdapAuthAdapter();
}
