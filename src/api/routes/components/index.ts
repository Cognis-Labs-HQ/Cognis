import type { RouteHandler } from "../../reuse/route-registry.js";
import type { RouteContext } from "../../reuse/route-context.js";
import type { ComponentService } from "../../components/service.js";
import type { createComponentFailures } from "../../components/failures.js";
import { readJson } from "../../reuse/read-json.js";
import type { BootstrapLog } from "@cognis/core";

export function createComponentRoutes(
    service: ComponentService,
    reportFailure: ReturnType<typeof createComponentFailures>,
    ctx: RouteContext,
    log: BootstrapLog,
): RouteHandler {
    return async (request, response, url) => {
        if (!url.pathname.startsWith("/api/v1/components")) return false;
        const reporting = url.pathname === "/api/v1/components/failures";
        const claims = ctx.requireAuth(
            request,
            response,
            reporting ? "user" : "admin",
        );
        if (!claims) return true;
        try {
            let data;
            const match = url.pathname.match(
                /^\/api\/v1\/components\/(module|gateway|adapter)\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/(info|release-channel|release-channels)$/,
            );
            if (reporting && request.method === "POST")
                data = await reportFailure(
                    request,
                    await readJson(request, { maxBytes: 8192 }),
                    ctx.hasMinRole(claims.role, "admin"),
                );
            else if (
                url.pathname === "/api/v1/components" &&
                request.method === "GET"
            )
                data = await service.list(request);
            else if (
                url.pathname === "/api/v1/components/actions" &&
                request.method === "POST"
            ) {
                const input = await readJson(request, { maxBytes: 8192 });
                const streaming =
                    request.headers.accept === "application/x-ndjson";
                const send = (event: Record<string, unknown>) => {
                    if (response.destroyed || response.writableEnded) return;
                    if (!response.headersSent) {
                        response.writeHead(200, {
                            "content-type": "application/x-ndjson",
                            "cache-control": "no-store",
                            "x-accel-buffering": "no",
                        });
                        response.flushHeaders();
                    }
                    response.write(JSON.stringify(event) + "\n");
                };
                data = await service.apply(
                    request,
                    input,
                    streaming
                        ? {
                              onProgress: (event) =>
                                  send({ ...event, type: "progress" }),
                          }
                        : undefined,
                );
                if (streaming) {
                    send({ type: "result", payload: { data } });
                    response.end();
                    return true;
                }
            } else if (match) {
                const target = {
                    type: match[1],
                    id: match[3] ?? match[2],
                    ...(match[1] === "adapter" ? { gatewayId: match[2] } : {}),
                };
                const operation = match[4];
                if (operation === "info" && request.method === "GET")
                    data = await service.info(request, { target });
                else if (
                    operation === "release-channels" &&
                    request.method === "GET"
                )
                    data = (
                        (await service.releaseChannels(request, {
                            target,
                        })) as { data: unknown }
                    ).data;
                else if (
                    operation === "release-channel" &&
                    ["GET", "PUT"].includes(request.method ?? "")
                )
                    data = await service.releaseChannel(request, {
                        target,
                        ...(request.method === "PUT"
                            ? {
                                  channel: (
                                      await readJson(request, {
                                          maxBytes: 8192,
                                      })
                                  ).channel,
                              }
                            : {}),
                    });
                else {
                    response.writeHead(405);
                    response.end();
                    return true;
                }
            } else {
                response.writeHead(404);
                response.end();
                return true;
            }
            response.writeHead(200, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            response.end(JSON.stringify({ data }));
        } catch (error) {
            const status = Number((error as { status?: number }).status) || 500;
            log("error", "Component management request failed.", {
                component: "api",
                operation: "componentRequest",
                accountId: claims.sub,
                errorName: error instanceof Error ? error.name : "UnknownError",
                status,
            });
            if (response.headersSent) {
                if (!response.destroyed && !response.writableEnded)
                    response.end(
                        JSON.stringify({
                            type: "error",
                            status,
                            error: {
                                code:
                                    status < 500 && error instanceof Error
                                        ? error.message
                                        : "component_management_failed",
                            },
                        }) + "\n",
                    );
                return true;
            }
            response.writeHead(status, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    error: {
                        code:
                            status < 500 && error instanceof Error
                                ? error.message
                                : "component_management_failed",
                    },
                }),
            );
        }
        return true;
    };
}
