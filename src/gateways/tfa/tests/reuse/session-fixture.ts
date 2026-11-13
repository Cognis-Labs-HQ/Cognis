import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { createRouteLifetime } from "../../bootstrap/route-lifetime.js";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
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

export async function createSessionFixture() {
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
    const state = {
        commits: 0,
        committedInputs: [] as unknown[],
        issued: [] as Array<{ setupPending: boolean }>,
        logs: [] as unknown[],
        commitOutcome: "success",
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("auth:requireAuth", () => ({
        sub: candidate.accountId,
        role: "user",
        providerId: "local",
        ttlSeconds: 1800,
        setupPending: true,
    }));
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
            const id = `attempt-${attempts.size}`;
            attempts.set(id, { ...input });
            return { id };
        },
    );
    capabilities.contribute(
        "tfa:getPendingLoginAttempt",
        (id: string) => attempts.get(id) ?? null,
    );
    capabilities.contribute("auth:consumePendingLoginAttempt", (id: string) =>
        attempts.delete(id),
    );
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
            registerSessionAssessment(context, gateway);
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
        async request(path: string, body: Record<string, unknown>) {
            let payload = "";
            const req = new IncomingMessage(new Socket());
            req.method = "POST";
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
