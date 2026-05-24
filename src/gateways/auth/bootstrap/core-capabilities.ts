import { registerPageScriptOrigins } from "../../shared.js";
import { issueAccessToken } from "../access-tokens.js";
import type { AuthBootstrapHookContext } from "./index.js";

export async function registerAuthBootstrapHook({
    accountStore,
    authGateway,
    ctx,
    routeContext,
}: AuthBootstrapHookContext): Promise<void> {
    ctx.capabilities.contribute("auth:accountStore", accountStore);
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
    ctx.capabilities.contribute("auth:routeContext", routeContext);
}
