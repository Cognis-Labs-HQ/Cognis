import type { AuthContext, FlowApi } from "@cognis/core";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";
import { registerLdapFlowHooks } from "./flow-hooks.js";
import { StandardLdapClient } from "./client.js";

export interface LdapIdentity {
    id: string;
    email?: string;
    emails?: string[];
    displayName?: string;
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

export interface LdapCredentialTestResult {
    credentialTest: {
        accountId: string;
        dn?: string;
        email?: string;
        displayName?: string;
        groups: string[];
        role: string;
    };
}

export interface LdapClient {
    authenticate(
        username: string,
        password: string,
        options: LdapRuntimeOptions,
    ): Promise<LdapIdentity | null>;
    testConnection?(
        options: LdapRuntimeOptions,
    ): Promise<boolean | LdapDirectorySample>;
    discover?(options: LdapRuntimeOptions): Promise<LdapDirectorySample>;
    validatePassword?(
        accountId: string,
        currentPassword: string,
        options: LdapRuntimeOptions,
    ): Promise<boolean>;
    updatePassword?(
        accountId: string,
        nextPassword: string,
        options: LdapRuntimeOptions,
    ): Promise<boolean>;
}

export interface LdapRuntimeOptions {
    identifier?: string;
    serverUrl: string;
    port?: number;
    baseDn: string;
    userDn?: string;
    groupDn?: string;
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
    writebackEnabled?: boolean;
    writebackBaseDn?: string;
    writebackUserAttribute?: string;
}

interface LdapConfiguration {
    unify: boolean;
    servers: LdapRuntimeOptions[];
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

function describeLdapTestFailure(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (/0x31|invalid credentials|code\s*49\b/i.test(message)) {
        return new Error(
            "LDAP rejected the bind DN or bind password. Verify the service account credentials and distinguished name.",
            { cause: error },
        );
    }
    if (/ECONNREFUSED|connect.*refused/i.test(message)) {
        return new Error(
            "LDAP refused the connection. Verify the server URL, port, and TLS mode.",
            { cause: error },
        );
    }
    if (/certificate|self[- ]signed|unable to verify/i.test(message)) {
        return new Error(
            "LDAP TLS certificate validation failed. Verify the server certificate and hostname.",
            { cause: error },
        );
    }
    return new Error(
        "LDAP connection test failed. Verify the server, search base, and directory filters.",
        { cause: error },
    );
}

class LdapAuthAdapter implements AuthProviderAdapter {
    readonly id = "ldap";
    readonly name = "LDAP";
    readonly configPopupScriptUrl =
        "/static/adapters/auth/ldap/config-popup.js";
    readonly version = "0.5.7";

    private client: LdapClient = new StandardLdapClient();
    private adminGroups = new Set(["cognis-admins"]);
    private writebackEnabled = false;
    private writebackBaseDn = "";
    private writebackUserAttribute = "uid";
    private options: LdapRuntimeOptions = {
        serverUrl: "",
        baseDn: "",
        userDn: "",
        groupDn: "",
        bindDn: "",
        bindPassword: "",
        userFilter: "(&(objectClass=inetOrgPerson)(uid={username}))",
        groupFilter: "(|(objectClass=groupOfNames)(objectClass=posixGroup))",
        userAttribute: "uid",
        groupNameAttribute: "cn",
        groupMemberAttribute: "member",
        memberOfAttribute: "memberOf",
        nestedMemberOf: true,
        roleMappings: { "cognis-admins": "admin" },
    };
    private configuration: LdapConfiguration = {
        unify: true,
        servers: [],
    };

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const username = String(credentials.username ?? "");
        const password = String(credentials.password ?? "");
        if (!username || !password) return null;
        const requestedSource = String(credentials.authSourceId ?? "");
        const servers = this.configuration.servers.length
            ? this.configuration.servers
            : [this.options];
        const candidates =
            !this.configuration.unify && requestedSource.startsWith("ldap:")
                ? servers.filter(
                      (server) =>
                          `ldap:${encodeURIComponent(String(server.identifier ?? ""))}` ===
                          requestedSource,
                  )
                : servers;
        for (const server of candidates) {
            let identity: LdapIdentity | null;
            try {
                identity = await this.client.authenticate(
                    username,
                    password,
                    server,
                );
            } catch {
                // A unified source is a failover list. A broken earlier server
                // must not prevent a later copy of the directory from working.
                if (this.configuration.unify) continue;
                return null;
            }
            if (!identity) continue;
            const role = this.resolveRole(identity.groups ?? [], server);
            if (!role) return null;
            const source = String(server.identifier ?? "").trim();
            const sourceProvider = source
                ? `ldap:${encodeURIComponent(source)}`
                : "ldap";
            const accountId =
                !this.configuration.unify && source
                    ? `${sourceProvider}:${identity.id}`
                    : identity.id;
            return {
                accountId,
                provider: sourceProvider,
                externalUserId: source
                    ? `${sourceProvider}:${identity.dn ?? identity.id}`
                    : (identity.dn ?? identity.id),
                email: identity.email,
                emails: identity.emails,
                displayName: identity.displayName,
                role,
            } as AuthContext & { emails?: string[] };
        }
        return null;
    }

    async confirmPassword(
        accountId: string,
        password: string,
        providerId = "ldap",
    ): Promise<boolean> {
        const providerPrefix = `${providerId}:`;
        const username = accountId.startsWith(providerPrefix)
            ? accountId.slice(providerPrefix.length)
            : accountId;
        const session = await this.authenticate({
            username,
            password,
            authSourceId: providerId,
        });
        return session?.accountId === accountId;
    }

    private resolveRole(
        groups: string[],
        options: LdapRuntimeOptions = this.options,
    ): string | null {
        const mappedRoles: string[] = [];
        for (const group of groups) {
            const mapped =
                options.roleMappings[group] ??
                options.roleMappings[group.toLowerCase()];
            if (mapped) mappedRoles.push(mapped);
        }
        for (const role of ["admin", "moderator", "teacher", "user"])
            if (mappedRoles.includes(role)) return role;
        if (groups.some((g) => this.adminGroups.has(g))) return "admin";
        return Object.values(options.roleMappings).includes("user")
            ? null
            : "user";
    }

    getLoginMethods(): Array<{
        id: string;
        name: string;
        credential: boolean;
    }> {
        if (this.configuration.unify || !this.configuration.servers.length) {
            return [{ id: this.id, name: this.name, credential: true }];
        }
        return this.configuration.servers.map((server) => ({
            id: `ldap:${encodeURIComponent(String(server.identifier ?? ""))}`,
            name: String(server.identifier),
            credential: true,
        }));
    }

    isConfigured(): boolean {
        return (
            this.configuration.servers.length > 0 &&
            this.configuration.servers.every(
                (server) =>
                    Boolean(server.identifier?.trim()) &&
                    Boolean(server.serverUrl?.trim()) &&
                    Boolean(server.baseDn?.trim()) &&
                    Boolean(server.bindDn?.trim()) &&
                    Boolean(server.bindPassword) &&
                    Boolean(server.userAttribute?.trim()) &&
                    Boolean(server.userFilter?.trim()),
            )
        );
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
            {
                key: "userDn",
                label: "User DN",
                type: "text",
                required: false,
            },
            {
                key: "groupDn",
                label: "Group DN",
                type: "text",
                required: false,
            },
            { key: "bindDn", label: "Bind DN", type: "text", required: true },
            {
                key: "bindPassword",
                label: "Bind Password",
                type: "password",
                required: true,
            },
            {
                key: "userAttribute",
                label: "Username Attribute",
                type: "text",
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
        if (Array.isArray(config.servers)) {
            const servers = config.servers
                .filter(
                    (server): server is Record<string, unknown> =>
                        Boolean(server) && typeof server === "object",
                )
                .map((server) => this.normalizeOptions(server));
            this.configuration = {
                unify: config.unify !== false,
                servers,
            };
            if (servers[0]) this.options = servers[0];
            return;
        }
        this.options = this.normalizeOptions(config);
        this.configuration = { unify: true, servers: [this.options] };
    }

    private normalizeOptions(
        config: Record<string, unknown>,
    ): LdapRuntimeOptions {
        const options = {
            ...this.options,
            ...Object.fromEntries(
                Object.entries(config).filter(
                    ([, v]) => typeof v !== "undefined",
                ),
            ),
        } as LdapRuntimeOptions;
        const configuredUrl = String(
            config.serverUrl ?? config.host ?? options.serverUrl ?? "",
        ).trim();
        const legacyPort = Number(config.port ?? this.options.port);
        options.serverUrl =
            configuredUrl && !configuredUrl.includes("://")
                ? `${legacyPort === 636 ? "ldaps" : "ldap"}://${configuredUrl}${Number.isFinite(legacyPort) ? `:${legacyPort}` : ""}`
                : configuredUrl;
        options.roleMappings = parseRoleMappings(
            config.roleMappings ?? options.roleMappings,
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
        return options;
    }

    async testConfiguration(
        config: Record<string, unknown>,
    ): Promise<LdapDirectorySample | LdapCredentialTestResult> {
        const configuredServer = this.configuration.servers.find(
            (server) =>
                server.identifier &&
                server.identifier === String(config.identifier ?? ""),
        );
        const merged = {
            ...this.options,
            ...configuredServer,
            ...config,
            bindPassword:
                String(config.bindPassword ?? "") ||
                configuredServer?.bindPassword ||
                this.options.bindPassword,
        } as LdapRuntimeOptions;
        if (
            !merged.serverUrl ||
            !merged.baseDn ||
            !merged.bindDn ||
            !merged.bindPassword
        )
            throw new Error(
                "LDAP server URL, base DN, and bind credentials are required.",
            );
        const testUsername = String(config.testUsername ?? "").trim();
        const testPassword = String(config.testPassword ?? "");
        if (testUsername || testPassword) {
            if (!testUsername || !testPassword)
                throw new Error(
                    "LDAP test username and password are required.",
                );
            let identity;
            try {
                identity = await this.client.authenticate(
                    testUsername,
                    testPassword,
                    merged,
                );
            } catch (error) {
                throw describeLdapTestFailure(error);
            }
            if (!identity) throw new Error("LDAP user credential test failed.");
            const role = this.resolveRole(identity.groups ?? [], merged);
            if (!role)
                throw new Error(
                    "The LDAP user is not eligible for a mapped Cognis role.",
                );
            return {
                credentialTest: {
                    accountId: identity.id,
                    dn: identity.dn,
                    email: identity.email,
                    displayName: identity.displayName,
                    groups: identity.groups ?? [],
                    role,
                },
            };
        }
        if (this.client.discover) {
            try {
                return await this.client.discover(merged);
            } catch (error) {
                throw describeLdapTestFailure(error);
            }
        }
        if (this.client?.testConnection) {
            const result = await this.client.testConnection(merged);
            if (result && typeof result === "object") return result;
            if (result === false)
                throw new Error("LDAP connection test failed.");
        }
        throw new Error(
            "The LDAP client does not support directory discovery.",
        );
    }

    getPasswordResetSupport(): { supported: boolean; reason?: string } {
        const configuredServers = this.configuration.servers.filter(
            (server) => server.writebackEnabled === true,
        );
        if (!this.writebackEnabled && !configuredServers.length)
            return {
                supported: false,
                reason: "gateway.auth.security.ldap.writeback_disabled",
            };
        if (
            !this.writebackBaseDn &&
            !configuredServers.some((server) => server.writebackBaseDn)
        )
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
        providerId?: string,
    ): Promise<{ updated: boolean; message?: string }> {
        const sourceMatch = /^ldap:([^:]+):/.exec(accountId);
        const providerSource = /^ldap:(.+)$/.exec(providerId ?? "");
        const source = decodeURIComponent(
            sourceMatch?.[1] ?? providerSource?.[1] ?? "",
        );
        const selectedOptions = source
            ? (this.configuration.servers.find(
                  (server) => server.identifier === source,
              ) ?? this.options)
            : this.options;
        const directoryAccountId = sourceMatch
            ? accountId.slice(sourceMatch[0].length)
            : accountId;
        const support = this.getPasswordResetSupport();
        if (source && selectedOptions.writebackEnabled !== true)
            return {
                updated: false,
                message: "gateway.auth.security.ldap.writeback_disabled",
            };
        if (
            !support.supported ||
            !nextPassword ||
            !this.client?.validatePassword ||
            !this.client.updatePassword
        )
            return { updated: false, message: support.reason };
        const options = {
            ...selectedOptions,
            baseDn: selectedOptions.writebackBaseDn || this.writebackBaseDn,
            userAttribute:
                selectedOptions.writebackUserAttribute ||
                this.writebackUserAttribute,
        };
        if (
            !(await this.client.validatePassword(
                directoryAccountId,
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
                directoryAccountId,
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
