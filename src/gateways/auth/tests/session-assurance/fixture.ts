import { ServerResponse } from "node:http";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";
import { registerAuthBootstrapHook as registerSessionLogin } from "../../bootstrap/session-login.js";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
} from "@cognis/core";
import { CoreAuthGateway } from "../../gateway.js";
import { registerAuthBootstrapHook as registerLogin } from "../../bootstrap/flow-registrations.js";
import { registerAuthBootstrapHook as registerCommit } from "../../bootstrap/session-commit.js";
import type { AuthBootstrapHookContext } from "../../bootstrap/index.js";
import { createAuthRouteBootstrapRuntime } from "../../bootstrap/route-runtime.js";
import { createSessionRoutes } from "../../bootstrap/routes/session.js";
import { makeJsonRequest } from "../auth-gateway-test-helpers.js";

export async function createLoginFixture() {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const gatewayRegistry = new GatewayRegistry();
    const disposers: Array<
        (() => void | Promise<void>) & {
            reactivate?: () => void | Promise<void>;
        }
    > = [];
    const state = {
        lifecycle: "deactivated",
        credentialsValid: true,
        readFails: false,
        writeFails: false,
        enabled: true,
        activations: 0,
        logins: 0,
        readBarrier: undefined as (() => Promise<void>) | undefined,
        logs: [] as unknown[],
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("auth:userValidationModes", {
        evaluate: async () => ({ verified: true }),
    });
    capabilities.contribute("social:profileLifecycle", {
        async getState() {
            await state.readBarrier?.();
            if (state.readFails) throw new Error("synthetic_read_failure");
            return state.lifecycle;
        },
        async setState(_account: string, value: string) {
            if (state.writeFails) throw new Error("synthetic_write_failure");
            state.activations += 1;
            state.lifecycle = value;
        },
    });
    const database: ConstructorParameters<typeof CoreAuthGateway>[0] = {
        executeCommand: async () => ({ rows: [] }),
        ensureTable: async () => {},
        transaction: async (callback) => callback(database),
    };
    const authGateway = new CoreAuthGateway(database);
    authGateway.registerAdapter({
        id: "local",
        name: "Local contract fake",
        locked: true,
        authenticate: async () =>
            state.credentialsValid
                ? {
                      accountId: "assurance-user",
                      externalUserId: "assurance-user",
                      provider: "local",
                      role: "user",
                  }
                : null,
        configure() {},
        getConfigSchema: () => [],
    });
    const runtime = createAuthRouteBootstrapRuntime();
    const context: AuthBootstrapHookContext = {
        ctx: {
            capabilities,
            gatewayRegistry,
            adaptersRoot: "/unused-offline-fixture",
            routeRegistry: new RouteRegistry(),
            flow: root.flow,
            log: (...args: unknown[]) => state.logs.push(args),
        },
        authGateway,
        authRouteBootstrapRuntime: runtime,
        routeContext: createDefaultRouteContext({ flow: root.flow }),
        accountStore: {
            ensureSchema: async () => {},
            has: async () => true,
            delete: async () => {
                throw new Error("unexpected_account_delete");
            },
            setFounder: async () => {
                throw new Error("unexpected_founder_change");
            },
            verify: async () => state.credentialsValid,
            getInfo: async () => ({
                accountId: "assurance-user",
                username: "assurance-user",
                enabled: state.enabled,
            }),
            isFounder: async () => false,
            updateLastLogin: async () => {
                state.logins += 1;
            },
            getDisplayName: async () => null,
            getUsername: async () => "assurance-user",
        },
        readSecuritySettings: async () => ({
            userValidationMode: "none",
            loginSessionTimeoutMinutes: 30,
        }),
    };
    await runBootstrapScope(
        root,
        "gateway:auth",
        async () => {
            await registerLogin(context);
            await registerCommit(context);
            await registerSessionLogin(context);
        },
        (dispose) => disposers.push(dispose),
    );
    const route = createSessionRoutes({
        authGateway,
        accountStore: context.accountStore,
        capabilities,
        authRouteBootstrapRuntime: runtime,
        readSecuritySettings: context.readSecuritySettings,
    });
    return {
        context,
        root,
        capabilities,
        gatewayRegistry,
        state,
        disposers,
        login: async () => {
            return capabilities.require<
                (
                    input: Record<string, unknown>,
                ) => Promise<Record<string, unknown>>
            >("auth:login")({
                provider: "local",
            });
        },
        request: async (
            body: Record<string, unknown> = { provider: "local" },
        ) => {
            const req = makeJsonRequest("POST", body);
            const res = new ServerResponse(req);
            let payload = "";
            res.end = (chunk?: unknown) => {
                payload = String(chunk ?? "");
                return res;
            };
            await route(
                req,
                res,
                new URL("http://localhost/api/v1/auth/login"),
                {
                    component: "auth-gateway",
                    method: "POST",
                    path: "/api/v1/auth/login",
                },
            );
            return {
                status: res.statusCode,
                headers: res.getHeaders(),
                payload,
            };
        },
        requireTfa: () =>
            gatewayRegistry.register({ id: "tfa", name: "TFA", version: "1" }),
    };
}
