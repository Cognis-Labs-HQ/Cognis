import { registerEnforcementPolicy } from "../../bootstrap/enforcement-policy.js";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { createRouteLifetime } from "../../bootstrap/route-lifetime.js";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
    requireBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type { GatewayBootstrapContext } from "../../../shared.js";
import { CoreTfaGateway } from "../../gateway.js";
import { registerSessionAssessment } from "../../bootstrap/session-assessment.js";
import { createTfaRoutes } from "../../bootstrap/tfa-routes.js";
import { createStoreMock, createAdapterMock } from "./gateway-fixture.js";

export const candidate = {
    accountId: "alice",
    role: "user" as const,
    provider: "local",
    providerId: "local",
    displayName: "Alice",
    isFounder: false,
    ttlSeconds: 1800,
    userValidationMode: "none",
    requiredUserValidation: false,
};

export async function createSessionFixture(
    options: { lifetimeAvailable?: boolean } = {},
) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const gatewayRegistry = new GatewayRegistry();
    gatewayRegistry.register({ id: "tfa", name: "TFA", version: "1" });
    const routeRegistry = new RouteRegistry();
    const store = createStoreMock();
    const adapter = createAdapterMock();
    const gateway = new CoreTfaGateway(store);
    gateway.registerAdapter(adapter);
    await gateway.enableAdapter(adapter.id);
    const attempts = new Map<string, typeof candidate>();
    let attemptCounter = 0;
    const lifetimes = new Map<
        string,
        {
            id: string;
            accountId: string;
            expiresAt: number;
            signal: AbortSignal;
            controller: AbortController;
        }
    >();
    const clearAttempt = (id: string) => {
        lifetimes.get(id)?.controller.abort();
        lifetimes.delete(id);
        return attempts.delete(id);
    };
    if (options.lifetimeAvailable !== false) {
        await runBootstrapScope(root, "gateway:auth:synthetic", async () => {
            root.requireCapability<CapabilityContracts>(
                "system:contracts",
            ).define("auth:getPendingLoginLifetime", {
                version: 1,
                kind: "function",
                description:
                    "Synthetic public owner contract for isolated lifetime testing.",
            });
            root.contributePublicCapability(
                "auth:getPendingLoginLifetime",
                (id: string) => lifetimes.get(id) ?? null,
            );
        });
    }
    const state = {
        authenticated: true,
        commits: 0,
        committedInputs: [] as unknown[],
        issued: [] as Array<{ setupPending: boolean }>,
        logs: [] as unknown[],
        commitOutcome: "success",
    };
    capabilities.contribute("system:ctx", root);
    const claims = {
        sub: candidate.accountId,
        role: "user",
        providerId: "local",
        ttlSeconds: 1800,
        setupPending: true,
    };
    capabilities.contribute(
        "auth:requireAuth",
        (_req: IncomingMessage, res: ServerResponse) => {
            if (state.authenticated) return claims;
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { code: "unauthorized" } }));
            return null;
        },
    );
    capabilities.contribute("auth:getAuthClaims", () =>
        state.authenticated ? claims : null,
    );
    capabilities.contribute(
        "auth:issueAccessToken",
        (
            _subject: string,
            _role: string,
            _ttl: number,
            options: { setupPending: boolean },
        ) => {
            state.issued.push(options);
            return "restricted-token";
        },
    );
    capabilities.contribute("auth:completeSession", async (input: unknown) => {
        const { isAssuranceCurrent, ...session } = input as {
            isAssuranceCurrent?: () => boolean;
            [key: string]: unknown;
        };
        if (isAssuranceCurrent && !isAssuranceCurrent())
            return { outcome: "session_unavailable" };
        state.committedInputs.push(session);
        state.commits += 1;
        return {
            outcome: state.commitOutcome,
            ...(state.commitOutcome === "success"
                ? { token: "assured-token" }
                : {}),
        };
    });
    capabilities.contribute(
        "auth:buildAccessTokenCookie",
        (_req: unknown, token: string) => `session=${token}`,
    );
    capabilities.contribute(
        "tfa:createPendingLoginAttempt",
        (input: typeof candidate) => {
            const id = `attempt-${attemptCounter++}`;
            const controller = new AbortController();
            lifetimes.set(id, {
                id,
                accountId: input.accountId,
                expiresAt: Date.now() + 300_000,
                signal: controller.signal,
                controller,
            });
            attempts.set(id, { ...input });
            return { id };
        },
    );
    capabilities.contribute(
        "tfa:getPendingLoginAttempt",
        (id: string) => attempts.get(id) ?? null,
    );
    capabilities.contribute("auth:consumePendingLoginAttempt", clearAttempt);
    capabilities.contribute("tfa:clearPendingLoginAttempt", clearAttempt);
    const context: GatewayBootstrapContext = {
        capabilities,
        gatewayRegistry,
        routeRegistry,
        adaptersRoot: "/unused-offline-fixture",
        flow: root.flow,
        log: (...args: unknown[]) => {
            state.logs.push(args);
        },
    };
    const disposers: Array<
        (() => void | Promise<void>) & {
            reactivate?: () => void | Promise<void>;
        }
    > = [];
    const route = await runBootstrapScope(
        root,
        "gateway:tfa",
        async () => {
            requireBootstrapScope(root).registerDisposer(() =>
                gateway.disposeChallenges(),
            );
            const suspendAssessments = registerSessionAssessment(
                context,
                gateway,
            );
            registerEnforcementPolicy(context, gateway, suspendAssessments);
            const lifetime = createRouteLifetime(context);
            const handler = createTfaRoutes(
                gateway,
                capabilities,
                context.log,
                lifetime,
            );
            lifetime.register(handler);
            return handler;
        },
        (dispose) => {
            disposers.push(dispose);
            gatewayRegistry.retainBootstrapDisposer("tfa", dispose);
        },
    );
    return {
        root,
        capabilities,
        gatewayRegistry,
        routeRegistry,
        store,
        gateway,
        adapter,
        state,
        attempts,
        lifetimes,
        disposers,
        assess: () =>
            capabilities.require<
                (input: typeof candidate) => Promise<Record<string, unknown>>
            >("tfa:assessSession")(candidate),
        enroll: () =>
            store.upsertUserMethod({
                accountId: candidate.accountId,
                methodId: adapter.id,
                enabled: true,
                sortOrder: 0,
                state: {},
            }),
        async request(
            path: string,
            body: Record<string, unknown>,
            method = "POST",
        ) {
            let payload = "";
            const req = new IncomingMessage(new Socket());
            req.method = method;
            req.url = path;
            req.push(Buffer.from(JSON.stringify(body)));
            req.push(null);
            const res = new ServerResponse(req);
            res.end = (chunk?: unknown) => {
                payload = String(chunk ?? "");
                return res;
            };
            const handled = await route(
                req,
                res,
                new URL(path, "http://localhost"),
            );
            return {
                handled,
                status: res.statusCode,
                headers: res.getHeaders(),
                body: JSON.parse(payload) as {
                    error?: { code: string };
                    data?: Record<string, unknown>;
                },
            };
        },
    };
}
