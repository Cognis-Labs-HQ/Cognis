import { Attribute, Change, Client, Filter } from "ldapts";
import type {
    LdapClient,
    LdapDirectorySample,
    LdapIdentity,
    LdapRuntimeOptions,
} from "./index.js";

type LdapEntry = Record<string, unknown> & { dn: string };

function values(entry: LdapEntry, attribute: string): string[] {
    const raw = entry[attribute];
    if (Array.isArray(raw)) return raw.map(String);
    return raw == null ? [] : [String(raw)];
}

function first(entry: LdapEntry, ...attributes: string[]): string | undefined {
    for (const attribute of attributes) {
        const value = values(entry, attribute)[0];
        if (value) return value;
    }
    return undefined;
}

function userFilter(options: LdapRuntimeOptions, username: string): string {
    return options.userFilter.includes("{username}")
        ? options.userFilter.replaceAll(
              "{username}",
              Filter.escape(username).toString(),
          )
        : `(&${options.userFilter}(${options.userAttribute}=${Filter.escape(username)}))`;
}

function searchBase(
    options: LdapRuntimeOptions,
    specificDn: "userDn" | "groupDn",
): string {
    return String(options[specificDn] ?? "").trim() || options.baseDn;
}

async function withBoundClient<T>(
    options: LdapRuntimeOptions,
    dn: string,
    password: string,
    operation: (client: Client) => Promise<T>,
): Promise<T> {
    const client = new Client({
        url: options.serverUrl,
        timeout: 10_000,
        connectTimeout: 10_000,
        strictDN: true,
    });
    try {
        await client.bind(dn, password);
        return await operation(client);
    } finally {
        await client.unbind().catch(() => undefined);
    }
}

async function findUser(
    client: Client,
    options: LdapRuntimeOptions,
    username: string,
): Promise<LdapEntry | undefined> {
    const result = await client.search(searchBase(options, "userDn"), {
        scope: "sub",
        filter: userFilter(options, username),
        attributes: [
            options.userAttribute,
            "mail",
            "displayName",
            "cn",
            options.memberOfAttribute,
        ],
        sizeLimit: 2,
        timeLimit: 10,
    });
    if (result.searchEntries.length !== 1) return undefined;
    return result.searchEntries[0] as LdapEntry;
}

function mapUser(entry: LdapEntry, options: LdapRuntimeOptions) {
    const memberOf = values(entry, options.memberOfAttribute);
    return {
        id: first(entry, options.userAttribute) ?? entry.dn,
        dn: entry.dn,
        email: first(entry, "mail"),
        displayName: first(entry, "displayName", "cn"),
        memberOf,
        groups: memberOf.map((dn) => firstRdnValue(dn)),
    };
}

async function resolveGroups(
    client: Client,
    entry: LdapEntry,
    options: LdapRuntimeOptions,
): Promise<string[]> {
    const result = await client.search(searchBase(options, "groupDn"), {
        scope: "sub",
        filter: options.groupFilter,
        attributes: [
            options.groupNameAttribute,
            options.groupMemberAttribute,
            "uniqueMember",
            "memberUid",
        ],
        paged: { pageSize: 100, pagePause: false },
        sizeLimit: 500,
        timeLimit: 15,
    });
    const username = first(entry, options.userAttribute) ?? "";
    const directDns = new Set(values(entry, options.memberOfAttribute));
    for (const raw of result.searchEntries) {
        const group = raw as LdapEntry;
        const members = [
            ...values(group, options.groupMemberAttribute),
            ...values(group, "uniqueMember"),
            ...values(group, "memberUid"),
        ];
        if (members.includes(entry.dn) || members.includes(username))
            directDns.add(group.dn);
    }
    if (options.nestedMemberOf) {
        let changed = true;
        while (changed) {
            changed = false;
            for (const raw of result.searchEntries) {
                const group = raw as LdapEntry;
                const members = [
                    ...values(group, options.groupMemberAttribute),
                    ...values(group, "uniqueMember"),
                ];
                if (
                    members.some((member) => directDns.has(member)) &&
                    !directDns.has(group.dn)
                ) {
                    directDns.add(group.dn);
                    changed = true;
                }
            }
        }
    }
    const namesByDn = new Map(
        result.searchEntries.map((raw) => {
            const group = raw as LdapEntry;
            return [
                group.dn,
                first(group, options.groupNameAttribute) ??
                    firstRdnValue(group.dn),
            ];
        }),
    );
    return [...directDns].map((dn) => namesByDn.get(dn) ?? firstRdnValue(dn));
}

function firstRdnValue(dn: string): string {
    const match = /^[^=]+=((?:\\.|[^,])*)/.exec(dn);
    return match?.[1]?.replace(/\\([,=+<>#;\\"])/g, "$1") ?? dn;
}

/** A real, bounded LDAP client suitable for OpenLDAP and FreeIPA. */
export class StandardLdapClient implements LdapClient {
    async authenticate(
        username: string,
        password: string,
        options: LdapRuntimeOptions,
    ): Promise<LdapIdentity | null> {
        const entry = await withBoundClient(
            options,
            options.bindDn,
            options.bindPassword,
            (client) => findUser(client, options, username),
        );
        if (!entry) return null;
        try {
            await withBoundClient(
                options,
                entry.dn,
                password,
                async () => true,
            );
        } catch {
            return null;
        }
        const groups = await withBoundClient(
            options,
            options.bindDn,
            options.bindPassword,
            (client) => resolveGroups(client, entry, options),
        );
        const user = mapUser(entry, options);
        return { ...user, groups };
    }

    async discover(options: LdapRuntimeOptions): Promise<LdapDirectorySample> {
        return withBoundClient(
            options,
            options.bindDn,
            options.bindPassword,
            async (client) => {
                const [userResult, groupResult, rootDse] = await Promise.all([
                    client.search(searchBase(options, "userDn"), {
                        scope: "sub",
                        filter: options.userFilter.replaceAll(
                            "{username}",
                            "*",
                        ),
                        attributes: [
                            options.userAttribute,
                            "mail",
                            "displayName",
                            "cn",
                            options.memberOfAttribute,
                        ],
                        paged: { pageSize: 100, pagePause: false },
                        sizeLimit: 500,
                        timeLimit: 15,
                    }),
                    client.search(searchBase(options, "groupDn"), {
                        scope: "sub",
                        filter: options.groupFilter,
                        attributes: [
                            options.groupNameAttribute,
                            options.groupMemberAttribute,
                            "uniqueMember",
                            "memberUid",
                        ],
                        paged: { pageSize: 100, pagePause: false },
                        sizeLimit: 500,
                        timeLimit: 15,
                    }),
                    client.search("", {
                        scope: "base",
                        filter: "(objectClass=*)",
                        attributes: ["vendorName"],
                        sizeLimit: 1,
                    }),
                ]);
                const vendor = String(
                    rootDse.searchEntries[0]?.vendorName ?? "",
                );
                return {
                    directoryFlavor: /freeipa|389 project/i.test(vendor)
                        ? "freeipa"
                        : /openldap/i.test(vendor)
                          ? "openldap"
                          : "generic",
                    supportsMemberOf: userResult.searchEntries.some(
                        (entry) =>
                            values(
                                entry as LdapEntry,
                                options.memberOfAttribute,
                            ).length,
                    ),
                    users: userResult.searchEntries.map((entry) =>
                        mapUser(entry as LdapEntry, options),
                    ),
                    groups: groupResult.searchEntries.map((raw) => {
                        const entry = raw as LdapEntry;
                        return {
                            name:
                                first(entry, options.groupNameAttribute) ??
                                firstRdnValue(entry.dn),
                            dn: entry.dn,
                            members: [
                                ...values(entry, options.groupMemberAttribute),
                                ...values(entry, "uniqueMember"),
                                ...values(entry, "memberUid"),
                            ],
                        };
                    }),
                };
            },
        );
    }

    async validatePassword(
        accountId: string,
        currentPassword: string,
        options: LdapRuntimeOptions,
    ): Promise<boolean> {
        const entry = await withBoundClient(
            options,
            options.bindDn,
            options.bindPassword,
            (client) => findUser(client, options, accountId),
        );
        if (!entry) return false;
        try {
            return await withBoundClient(
                options,
                entry.dn,
                currentPassword,
                async () => true,
            );
        } catch {
            return false;
        }
    }

    async updatePassword(
        accountId: string,
        nextPassword: string,
        options: LdapRuntimeOptions,
    ): Promise<boolean> {
        return withBoundClient(
            options,
            options.bindDn,
            options.bindPassword,
            async (client) => {
                const entry = await findUser(client, options, accountId);
                if (!entry) return false;
                await client.modify(
                    entry.dn,
                    new Change({
                        operation: "replace",
                        modification: new Attribute({
                            type: "userPassword",
                            values: [nextPassword],
                        }),
                    }),
                );
                return true;
            },
        );
    }
}
