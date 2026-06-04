import type { Ctx } from "@cognis/core";

interface LdapAvailability {
    id: string;
    name: string;
    enabled: boolean;
}

export function registerLdapFlowHooks(
    ctx: Ctx,
    options: {
        getAvailability: () => LdapAvailability;
    },
): void {
    ctx.addFlowStageHook(
        "ldap-auth",
        "resolve-adapter",
        { id: "auth-ldap:resolve-adapter" },
        () => options.getAvailability(),
    );

    ctx.addFlowStageHook(
        "login",
        "authenticate",
        { id: "auth-ldap:login-authentication-bridge", order: 10 },
        () => options.getAvailability(),
    );

    ctx.addFlowStageHook(
        "construct-login-ui",
        "augment-methods",
        { id: "auth-ldap:login-method-availability", order: 10 },
        () => options.getAvailability(),
    );
}
