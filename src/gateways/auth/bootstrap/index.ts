import type { IncomingMessage } from "node:http";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import type { CapabilityStore, GatewayBootstrapContext } from "../../shared.js";
import type { AccessRole } from "../access-tokens.js";
import type { CoreAuthGateway } from "../gateway.js";
import { runBootstrapDirectoryHooks } from "../../reuse/bootstrap-loader.js";

export interface AuthAccountStore {
    ensureSchema(): Promise<void>;
    has(username: string): Promise<boolean>;
    delete(username: string): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    verify(username: string, password: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
    getInfo(username: string): Promise<{
        username: string;
        enabled: boolean;
        role?: string;
    } | null>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
}

export interface PendingTfaLoginAttempt {
    id: string;
    accountId: string;
    role: AccessRole;
    isFounder: boolean;
    provider: string;
    providerId: string;
    displayName: string;
    userValidationMode: "none" | "smtp";
    requiredUserValidation: boolean;
    expiresAt: number;
}

export interface AuthBootstrapHookContext {
    accountStore: AuthAccountStore;
    authGateway: CoreAuthGateway;
    ctx: GatewayBootstrapContext;
    routeContext: RouteContext;
}

export interface AuthRouteBootstrapRuntime {
    buildAccessTokenCookie: (
        req: IncomingMessage,
        rawToken: string,
        ttlSeconds: number | null,
    ) => string;
    clearPendingTfaLoginAttempt: (loginAttemptId: string) => void;
    createPendingTfaLoginAttempt: (
        input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
    ) => PendingTfaLoginAttempt;
    getAccessTokenTtlSeconds: () => number;
    getPendingTfaLoginAttempt: (
        loginAttemptId: string,
    ) => PendingTfaLoginAttempt | null;
}

export interface AuthRouteBootstrapHookContext {
    capabilities: CapabilityStore;
    runtime: AuthRouteBootstrapRuntime;
}

const bootstrapDirectoryUrl = new URL(".", import.meta.url);

export async function runAuthBootstrapHooks(
    context: AuthBootstrapHookContext,
): Promise<void> {
    await runBootstrapDirectoryHooks({
        context,
        directoryUrl: bootstrapDirectoryUrl,
        exportName: "registerAuthBootstrapHook",
    });
}

export async function runAuthRouteBootstrapHooks(
    context: AuthRouteBootstrapHookContext,
): Promise<void> {
    await runBootstrapDirectoryHooks({
        context,
        directoryUrl: bootstrapDirectoryUrl,
        exportName: "registerAuthRouteBootstrapHook",
    });
}
