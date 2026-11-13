import { registerPageScriptOrigins } from "../../shared.js";
import {
    issueAccessToken,
    revokeAccessTokensForSubject,
    revokeSetupPendingAccessTokens,
} from "../access-tokens.js";
import type { AuthProviderAdapter } from "../gateway.js";
import type { AuthBootstrapHookContext } from "./index.js";
import { registerAuthProviderRoutes } from "../provider-route-registrar.js";
import {
    createExternalProfileRegistry,
    type ExternalProfileResolver,
    type ExternalProfileRequest,
} from "../external-profile.js";

export async function registerAuthBootstrapHook({
    accountStore,
    authGateway,
    ctx,
    routeContext,
}: AuthBootstrapHookContext): Promise<void> {
    const externalProfiles = createExternalProfileRegistry();
    ctx.capabilities.contribute("auth:accountStore", accountStore);
    ctx.capabilities.contribute(
        "auth:registerExternalProfileProvider",
        (providerId: string, resolver: ExternalProfileResolver) =>
            externalProfiles.register(providerId, resolver),
    );
    ctx.capabilities.contribute(
        "auth:resolveExternalProfile",
        (request: ExternalProfileRequest) => externalProfiles.resolve(request),
    );
    ctx.capabilities.contribute(
        "auth:registerProvider",
        async (provider: AuthProviderAdapter, requires?: string[]) => {
            if (
                authGateway
                    .listAdapters()
                    .some((adapter) => adapter.id === provider.id)
            ) {
                throw new Error("auth_provider_already_registered");
            }
            const unregisterProvider = authGateway.registerAdapter(
                provider,
                requires,
            );
            let unregisterRoutes: () => void;
            try {
                await authGateway.restoreRegisteredAdapter(provider.id);
                unregisterRoutes = registerAuthProviderRoutes(
                    ctx.routeRegistry,
                    provider,
                    () => authGateway.getEnabledAdapter(provider.id) !== null,
                );
            } catch (error) {
                unregisterProvider();
                throw error;
            }
            ctx.log?.(
                "info",
                "Registered an external authentication provider.",
                {
                    component: "auth-gateway",
                    operation: "register_external_provider",
                    providerId: provider.id,
                },
            );
            return () => {
                unregisterRoutes();
                if (!unregisterProvider()) return;
                ctx.log?.(
                    "info",
                    "Unregistered an external authentication provider.",
                    {
                        component: "auth-gateway",
                        operation: "unregister_external_provider",
                        providerId: provider.id,
                    },
                );
            };
        },
    );
    ctx.capabilities.contribute(
        "auth:registerPageScriptOrigins",
        registerPageScriptOrigins,
    );
    ctx.capabilities.contribute(
        "auth:createLocalAdmin",
        async (username: string, password: string) => {
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter) throw new Error("local_adapter_unavailable");
            const has = await accountStore.has(username);
            if (!has) {
                await localAdapter.register(username, password, "admin");
            }
            await accountStore.setFounder(username, true);
        },
    );
    ctx.capabilities.contribute("auth:getLoginMethods", () =>
        authGateway.getEnabledAdapters().map((adapter) => ({
            id: adapter.id,
            name: adapter.name,
        })),
    );
    ctx.capabilities.contribute("auth:issueAccessToken", issueAccessToken);
    ctx.capabilities.contribute(
        "auth:getAuthClaims",
        routeContext.getAuthClaims,
    );
    ctx.capabilities.contribute("auth:requireAuth", routeContext.requireAuth);
    ctx.capabilities.contribute(
        "auth:requireRoleAccess",
        routeContext.requireRoleAccess,
    );
    ctx.capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeAccessTokensForSubject,
    );
    ctx.capabilities.contribute(
        "auth:revokeSetupPendingAccessTokens",
        revokeSetupPendingAccessTokens,
    );
    ctx.capabilities.contribute("auth:routeContext", routeContext);
}
