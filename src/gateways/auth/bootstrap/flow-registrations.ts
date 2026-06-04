import {
    AUTH_FLOW_CATALOG,
    BOOTSTRAP_FLOW_CATALOG,
    ensureCtxCapability,
    registerCanonicalFlow,
} from "@cognis/core";
import type { AuthBootstrapHookContext } from "./index.js";

function getEnabledLoginMethods(context: AuthBootstrapHookContext): Array<{
    id: string;
    name: string;
}> {
    return context.authGateway.getEnabledAdapters().map((adapter) => ({
        id: adapter.id,
        name: adapter.name,
    }));
}

export async function registerAuthBootstrapHook(
    context: AuthBootstrapHookContext,
): Promise<void> {
    const flowCtx = ensureCtxCapability(context.ctx.capabilities);

    for (const flow of [...BOOTSTRAP_FLOW_CATALOG, ...AUTH_FLOW_CATALOG]) {
        registerCanonicalFlow(flowCtx, flow);
    }

    flowCtx.addFlowStageHook(
        "bootstrap-platform",
        "register-flows",
        { id: "auth-gateway:bootstrap-registration" },
        () => ({
            gatewayId: "auth",
            registeredFlowIds: AUTH_FLOW_CATALOG.map((flow) => flow.id),
        }),
    );

    flowCtx.addFlowStageHook(
        "login",
        "resolve-provider",
        { id: "auth-gateway:enabled-providers" },
        () => {
            const enabledMethods = getEnabledLoginMethods(context);
            return {
                defaultProviderId: enabledMethods[0]?.id ?? null,
                enabledMethods,
            };
        },
    );

    flowCtx.addFlowStageHook(
        "construct-login-ui",
        "resolve-methods",
        { id: "auth-gateway:login-methods" },
        () => ({
            methods: getEnabledLoginMethods(context),
        }),
    );

    flowCtx.addFlowStageHook(
        "construct-settings-ui",
        "resolve-sections",
        { id: "auth-gateway:security-section" },
        () => ({
            gatewayId: "auth",
            sectionId: "security",
            scriptUrl: "/static/gateways/auth/security-prefs/index.js",
        }),
    );

    const ldapAdapter = context.authGateway.getAdapter("ldap");
    if (typeof ldapAdapter?.registerFlowHooks === "function") {
        ldapAdapter.registerFlowHooks(flowCtx, {
            enabled: context.authGateway.getEnabledAdapter("ldap") !== null,
        });
    }
}
