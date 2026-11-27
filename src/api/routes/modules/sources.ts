import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, ModuleMarketplaceService } from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";
import { readJson } from "../../reuse/read-json.js";

type SourceOperations = Pick<
    ModuleMarketplaceService,
    | "listSources"
    | "saveSource"
    | "removeSource"
    | "validateSourceCredential"
    | "getSettings"
    | "saveSettings"
>;
const INPUT_ERRORS = new Set([
    "invalid_source_uuid",
    "invalid_module_source",
    "invalid_module_source_credential",
    "module_source_credential_conflict",
    "module_source_credential_required",
    "module_source_credential_invalid",
    "module_source_credential_scope_changed",
    "trusted_module_source_readonly",
    "invalid_recommended_modules_url",
]);

export function createModuleSourceRoutes(
    marketplace: SourceOperations,
    ctx: Pick<RouteContext, "requireAuth">,
    log?: BootstrapLog,
) {
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            !url.pathname.startsWith("/api/v1/modules/sources") &&
            url.pathname !== "/api/v1/modules/settings"
        )
            return false;
        const logMetadata = {
            component: "api-modules",
            method: request.method ?? "GET",
            path: url.pathname,
        };
        try {
            if (
                marketplace &&
                url.pathname ===
                    "/api/v1/modules/sources/validate-credential" &&
                request.method === "POST"
            ) {
                const claims = ctx.requireAuth(request, response, "admin");
                if (!claims) return true;
                const body = await readJson(request);
                const data = await marketplace.validateSourceCredential(
                    body.source as never,
                    typeof body.token === "string" ? body.token : undefined,
                );
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data }));
                return true;
            }
            if (marketplace && url.pathname === "/api/v1/modules/sources") {
                const claims = ctx.requireAuth(request, response, "admin");
                if (!claims) return true;
                if (request.method === "GET") {
                    response.writeHead(200, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            data: await marketplace.listSources(),
                        }),
                    );
                    return true;
                }
                if (request.method === "POST") {
                    const body = await readJson(request);
                    if (
                        body.clearCredential !== undefined &&
                        typeof body.clearCredential !== "boolean"
                    )
                        throw new Error("invalid_module_source_credential");
                    const existingSource = (
                        await marketplace.listSources()
                    ).some((entry) => entry.uuid === body.uuid);
                    const source = await marketplace.saveSource(body as never, {
                        token: body.token as string | undefined,
                        clearCredential: body.clearCredential === true,
                    });
                    log?.(
                        "info",
                        existingSource
                            ? "Module source updated."
                            : "Module source added.",
                        {
                            ...logMetadata,
                            accountId: claims.sub,
                            sourceUuid: source.uuid,
                        },
                    );
                    response.writeHead(200, {
                        "content-type": "application/json",
                    });
                    response.end(JSON.stringify({ data: source }));
                    return true;
                }
            }
            if (marketplace && url.pathname === "/api/v1/modules/settings") {
                const claims = ctx.requireAuth(request, response, "admin");
                if (!claims) return true;
                const data =
                    request.method === "PUT"
                        ? await marketplace.saveSettings(
                              (await readJson(request)) as never,
                          )
                        : request.method === "GET"
                          ? await marketplace.getSettings()
                          : null;
                if (data) {
                    response.writeHead(200, {
                        "content-type": "application/json",
                    });
                    response.end(JSON.stringify({ data }));
                    return true;
                }
            }
            const sourceDeleteMatch = url.pathname.match(
                /^\/api\/v1\/modules\/sources\/([^/]+)$/,
            );
            if (
                marketplace &&
                sourceDeleteMatch &&
                request.method === "DELETE"
            ) {
                const claims = ctx.requireAuth(request, response, "admin");
                if (!claims) return true;
                await marketplace.removeSource(
                    decodeURIComponent(sourceDeleteMatch[1]),
                );
                log?.("warn", "Module source deleted.", {
                    ...logMetadata,
                    accountId: claims.sub,
                    sourceUuid: sourceDeleteMatch[1],
                });
                response.writeHead(204);
                response.end();
                return true;
            }
            return false;
        } catch (error) {
            const code =
                error instanceof Error &&
                (INPUT_ERRORS.has(error.message) ||
                    error.message === "server_secret_encryption_unavailable")
                    ? error.message
                    : "module_source_operation_failed";
            log?.("error", "Module source operation failed.", {
                ...logMetadata,
                code,
                errorName: error instanceof Error ? error.name : "Error",
            });
            response.writeHead(INPUT_ERRORS.has(code) ? 400 : 503, {
                "content-type": "application/json",
            });
            response.end(
                JSON.stringify({
                    error: { code, message: "Module source operation failed." },
                }),
            );
            return true;
        }
    };
}
