/**
 * Executes component-declared HTTP actions through scoped flows and offline storage.
 * Exports: registerOfflineHttpClient — register a bounded component read/write client.
 * @example const request = registerOfflineHttpClient(ctx, { owner, describe, request });
 * @param {object} ctx Lifecycle-scoped browser context.
 * @param {object} options Owning component's transport, request declarations and projections.
 * @returns {((path: string, options?: object) => Promise<Response>) & {hasCachedRead: (path: string) => boolean}} Scoped request executor and snapshot readiness.
 */
import { captureAccountGuard } from "./offline-identity.js";
import { createOfflineReadCache } from "./offline-read-cache.js";
import { deliverOrQueue } from "./offline-delivery.js";
import { registerScopedUiActions } from "./scoped-actions.js";
import { isOffline } from "./offline-state.js";

export function registerOfflineHttpClient(
    ctx,
    { owner, describe, request, project = (_path, payload) => payload },
) {
    const outbox = ctx.capabilities.get("offline:outbox");
    if (!outbox) throw new Error("offline_delivery_unavailable");
    const read = createOfflineReadCache({ signal: ctx.signal });
    const send = async (operation, signal = ctx.signal) => {
        const descriptor = describe(operation.path, operation.method);
        if (!descriptor?.write) throw new Error("invalid_offline_action");
        const body = operation.binary
            ? Uint8Array.from(atob(operation.body), (character) =>
                  character.charCodeAt(0),
              )
            : operation.body == null
              ? undefined
              : JSON.stringify(operation.body);
        const response = await request(operation.path, {
            method: operation.method,
            signal,
            headers: { "content-type": operation.contentType },
            body,
        });
        if (!response.ok) {
            let payload;
            try {
                payload = await response.json();
            } catch (error) {
                console.error("[offline] delivery response could not be read", {
                    component: owner,
                    operation: "readDeliveryResponse",
                    status: response.status,
                    errorName: error.name,
                });
                payload = { error: { code: "delivery_failed" } };
            }
            throw Object.assign(
                new Error(payload.error?.code ?? "delivery_failed"),
                { status: response.status, payload },
            );
        }
        return {
            status: response.status,
            payload: response.status === 204 ? null : await response.json(),
        };
    };
    outbox.register(owner, (operation) => send(operation), ctx.signal);
    const actions = registerScopedUiActions(ctx, owner.replaceAll(".", ":"), {
        request: async ({ path, options = {}, assertAccount }) => {
            assertAccount();
            const method = (options.method ?? "GET").toUpperCase();
            const descriptor = describe(path, method);
            // Guest credentials and undeclared actions always use the owning transport.
            if (
                !descriptor ||
                options.accessToken ||
                new Headers(options.headers).has("authorization")
            )
                return request(path, options);
            const pending = () => outbox.pending(owner);
            if (method === "GET") {
                const payload = await read(path, async () => {
                    assertAccount();
                    const response = await request(path, options);
                    if (!response.ok)
                        throw Object.assign(new Error("read_failed"), {
                            response,
                            status: response.status,
                        });
                    return response.json();
                });
                return Response.json(
                    await project(path, payload, await pending(), ctx),
                );
            }
            const id = crypto.randomUUID();
            let body = options.body == null ? null : options.body;
            if (descriptor.binary) {
                const bytes = new Uint8Array(
                    body instanceof Blob ? await body.arrayBuffer() : body,
                );
                assertAccount();
                if (bytes.byteLength > 350_000) {
                    // Large media may still be sent online, but cannot fit the bounded queue.
                    if (isOffline()) throw new Error("offline_outbox_full");
                    if ((await pending()).length) {
                        assertAccount();
                        await outbox.flush();
                        if ((await pending()).length)
                            throw new Error("offline_delivery_pending");
                    }
                    assertAccount();
                    return request(path, options);
                }
                body = btoa(
                    Array.from(bytes, (value) =>
                        String.fromCharCode(value),
                    ).join(""),
                );
            } else if (typeof body === "string") body = JSON.parse(body);
            if (descriptor.create)
                body = { ...body, operationId: body?.operationId ?? id };
            if (!descriptor.create) {
                const last = (await pending()).findLast(
                    ({ payload }) =>
                        payload.path === path && payload.method === method,
                );
                if (
                    last &&
                    JSON.stringify(last.payload.body) === JSON.stringify(body)
                )
                    return Response.json({ queued: true, data: null });
            }
            const operation = {
                path,
                method,
                body,
                binary: Boolean(descriptor.binary),
                contentType:
                    new Headers(options.headers).get("content-type") ??
                    "application/json",
                createdAt: new Date().toISOString(),
            };
            assertAccount();
            const result = await deliverOrQueue(
                ctx,
                owner,
                body?.operationId ?? id,
                operation,
                () => send(operation, options.signal),
            );
            assertAccount();
            if (!result?.queued)
                return result.status === 204
                    ? new Response(null, { status: 204 })
                    : Response.json(result.payload, { status: result.status });
            await ctx.runFlow("activity:record", {
                id: body?.operationId ?? id,
                type: owner,
                occurredAt: operation.createdAt,
                meta: { action: method.toLowerCase() },
            });
            return Response.json(
                {
                    queued: true,
                    data: descriptor.optimistic?.(operation, ctx) ?? null,
                },
                { status: 202 },
            );
        },
    });
    const scopedRequest = async (path, options = {}) => {
        options.signal?.throwIfAborted();
        const assertAccount = captureAccountGuard();
        try {
            const response = await actions.request({
                path,
                options,
                assertAccount,
            });
            assertAccount();
            return response;
        } catch (error) {
            assertAccount();
            if (error.response) return error.response;
            if (error.status && error.payload)
                return Response.json(error.payload, { status: error.status });
            throw error;
        }
    };
    scopedRequest.hasCachedRead = read.has;
    return scopedRequest;
}
