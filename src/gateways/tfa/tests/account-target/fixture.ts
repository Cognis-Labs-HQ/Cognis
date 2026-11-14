import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    registerBootstrapFlow,
    requireBootstrapScope,
    runBootstrapScope,
    type AccessRole,
    type CapabilityContracts,
} from "@cognis/core";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type { TestContext } from "node:test";
import type { AccountTargetRequest } from "../../../auth/contracts/account-target.js";
import type { GatewayBootstrapContext } from "../../../shared.js";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { CoreTfaGateway } from "../../gateway.js";
import { createRouteLifetime } from "../../bootstrap/route-lifetime.js";
import { createTfaRoutes } from "../../bootstrap/tfa-routes.js";
import {
    createStoreMock,
    createAdapterMock,
} from "../reuse/gateway-fixture.js";

export const targetRoutes = [
    { method: "GET", path: "/api/v1/tfa/status" },
    { method: "GET", path: "/api/v1/tfa/methods" },
    { method: "POST", path: "/api/v1/tfa/methods/totp/disable" },
    { method: "POST", path: "/api/v1/tfa/methods/totp/enable" },
    { method: "PUT", path: "/api/v1/tfa/methods/preferences" },
    { method: "GET", path: "/api/v1/tfa/recovery-codes" },
    { method: "POST", path: "/api/v1/tfa/recovery-codes/rotate" },
    { method: "GET", path: "/api/v1/tfa/recovery-codes/status" },
    {
        method: "POST",
        path: "/api/v1/tfa/admin/users/target/reset",
        reset: true,
    },
] as const;

export function targetPath(
    route: (typeof targetRoutes)[number],
    accountId: string,
): string {
    return "reset" in route
        ? `/api/v1/tfa/admin/users/${encodeURIComponent(accountId)}/reset`
        : `${route.path}?accountId=${encodeURIComponent(accountId)}`;
}

export async function createTargetFixture(
    context: TestContext,
    options: {
        role?: AccessRole;
        policyVersion?: number;
        missingPolicy?: boolean;
    } = {},
) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const registry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    registry.register({ id: "tfa", name: "TFA", version: "1" });
    registry.register({ id: "auth", name: "Auth fixture", version: "1" });
    const calls: Array<{ owner: string; operation: string; args: unknown[] }> =
        [];
    const instrument = <Target extends object>(
        owner: string,
        target: Target,
    ): Target =>
        new Proxy(target, {
            get(object, property, receiver) {
                const value = Reflect.get(object, property, receiver);
                if (typeof value !== "function") return value;
                return (...args: unknown[]) => {
                    calls.push({ owner, operation: String(property), args });
                    return Reflect.apply(value, object, args);
                };
            },
        });
    const store = createStoreMock();
    const adapter = createAdapterMock();
    const gateway = new CoreTfaGateway(instrument("store", store));
    gateway.registerAdapter(instrument("adapter", adapter));
    await gateway.enableAdapter(adapter.id);
    const state = {
        claims: {
            sub: "actor",
            role: options.role ?? "admin",
            ttlSeconds: 1800,
        },
        authenticated: true,
        policyCalls: [] as AccountTargetRequest[],
        stages: [] as string[],
        guards: [] as AccessRole[],
        logs: [] as unknown[],
        generation: 0,
        active: true,
        decide: ((input, isCurrent) => ({
            allowed: true,
            accountId: input.accountId,
            isCurrent,
        })) as (
            input: AccountTargetRequest,
            isCurrent: () => boolean,
        ) => unknown | Promise<unknown>,
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("auth:getAuthClaims", () =>
        state.authenticated ? state.claims : null,
    );
    capabilities.contribute(
        "auth:requireAuth",
        (
            _request: IncomingMessage,
            response: ServerResponse,
            minimum: AccessRole,
        ) => {
            state.guards.push(minimum);
            const denied =
                !state.authenticated ||
                (minimum === "admin" && state.claims.role === "user");
            if (!denied) return { ...state.claims };
            response.writeHead(state.authenticated ? 403 : 401, {
                "content-type": "application/json",
            });
            response.end(
                JSON.stringify({
                    error: {
                        code: state.authenticated
                            ? "forbidden"
                            : "unauthorized",
                    },
                }),
            );
            return null;
        },
    );
    if (!options.missingPolicy) {
        await runBootstrapScope(
            root,
            "gateway:auth",
            async () => {
                const dispose = () => {
                    state.active = false;
                    state.generation++;
                };
                dispose.reactivate = () => {
                    state.active = true;
                    state.generation++;
                };
                requireBootstrapScope(root).registerDisposer(dispose);
                root.requireCapability<CapabilityContracts>(
                    "system:contracts",
                ).define("auth:authorizeAccountTarget", {
                    version: options.policyVersion ?? 1,
                    kind: "function",
                    description:
                        "Synthetic public Auth authorization decisions for TFA consumer tests.",
                });
                const flow = registerBootstrapFlow(root, {
                    id: "auth:authorizeAccountTarget",
                    stages: ["captureRequest", "evaluate"],
                });
                flow.extend(
                    "captureRequest",
                    { id: "auth:captureRequest" },
                    ({ input, data }) => {
                        const request = input as AccountTargetRequest;
                        state.policyCalls.push(request);
                        state.stages.push("captureRequest");
                        data.generation = state.generation;
                    },
                );
                flow.extend(
                    "evaluate",
                    { id: "auth:evaluate" },
                    async ({ input, data }) => {
                        state.stages.push("evaluate");
                        const generation = data.generation;
                        data.decision = await state.decide(
                            input as AccountTargetRequest,
                            () =>
                                state.active && generation === state.generation,
                        );
                    },
                );
                root.contributePublicCapability(
                    "auth:authorizeAccountTarget",
                    async (input: AccountTargetRequest) => {
                        const result = await root.flow.run(
                            "auth:authorizeAccountTarget",
                            input,
                        );
                        return result.data.decision;
                    },
                );
            },
            (dispose) => registry.retainBootstrapDisposer("auth", dispose),
        );
    }
    const bootstrap: GatewayBootstrapContext = {
        capabilities,
        gatewayRegistry: registry,
        routeRegistry,
        adaptersRoot: "/unused-offline-fixture",
        flow: root.flow,
        log: (...args: unknown[]) => {
            state.logs.push(args);
        },
    };
    await runBootstrapScope(
        root,
        "gateway:tfa",
        async () => {
            const lifetime = createRouteLifetime(bootstrap);
            lifetime.register(
                createTfaRoutes(gateway, capabilities, bootstrap.log, lifetime),
            );
        },
        (dispose) => registry.retainBootstrapDisposer("tfa", dispose),
    );
    for (const accountId of [
        "actor",
        "target",
        "admin-target",
        "owner-target",
        "founder-target",
    ]) {
        await store.upsertUserMethod({
            accountId,
            methodId: adapter.id,
            enabled: true,
            sortOrder: 0,
            state: {},
        });
    }
    calls.length = 0;
    context.after(async () => {
        await gateway.disposeChallenges();
        await registry.disable("tfa");
        await registry.disable("auth");
    });
    return {
        root,
        capabilities,
        registry,
        routeRegistry,
        store,
        adapter,
        gateway,
        state,
        calls,
        async request(
            path: string,
            method = "GET",
            body: Record<string, unknown> = { methodIds: ["totp"] },
            beforeBody?: () => Promise<void>,
        ) {
            const request = new IncomingMessage(new Socket());
            request.method = method;
            request.url = path;
            const pushBody = () => {
                request.push(Buffer.from(JSON.stringify(body)));
                request.push(null);
            };
            if (beforeBody) {
                let started = false;
                request._read = () => {
                    if (started) return;
                    started = true;
                    void beforeBody().then(pushBody);
                };
            } else pushBody();
            const response = new ServerResponse(request);
            let payload = "";
            response.end = (chunk?: unknown) => {
                payload = String(chunk ?? "");
                return response;
            };
            let handled = false;
            for (const entry of routeRegistry.getEntries()) {
                handled = await entry.handler(
                    request,
                    response,
                    new URL(path, "http://localhost"),
                );
                if (handled) break;
            }
            return {
                handled,
                status: response.statusCode,
                body: payload ? JSON.parse(payload) : null,
            };
        },
    };
}
