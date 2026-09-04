import type { FlowApi } from "@cognis/core";

interface LdapAvailability {
    id: string;
    name: string;
    enabled: boolean;
}

export function registerLdapFlowHooks(
    flow: FlowApi,
    options: {
        getAvailability: () => LdapAvailability;
    },
): void {
    flow.extend(
        "ldap-auth",
        "resolve-adapter",
        { id: "auth-ldap:resolve-adapter" },
        () => options.getAvailability(),
    );

    flow.extend(
        "login",
        "authenticate",
        { id: "auth-ldap:login-authentication-bridge", order: 10 },
        () => options.getAvailability(),
    );

    flow.extend(
        "construct-login-ui",
        "augment-methods",
        { id: "auth-ldap:login-method-availability", order: 10 },
        () => options.getAvailability(),
    );
}
