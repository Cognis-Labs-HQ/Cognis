import type { ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import type { BootstrapLog } from "@cognis/core";
import type { RouteContext } from "./route-context.js";

export async function serveHtmlPage(
    response: ServerResponse,
    filePath: string,
    log?: BootstrapLog,
    logMetadata?: Record<string, unknown>,
    routeContext?: RouteContext,
): Promise<void> {
    try {
        const file = await readFile(filePath);
        routeContext?.setPageSecurityHeaders(response);
        response.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
        });
        response.end(file);
    } catch (error) {
        log?.("error", "Failed to serve UI asset.", {
            component: "api-ui",
            filePath,
            ...(logMetadata ?? {}),
            error: error instanceof Error ? error.message : String(error),
        });
        response.writeHead(404, { "content-type": "application/json" });
        response.end(
            JSON.stringify({
                error: { code: "not_found", message: "Asset not found." },
            }),
        );
    }
}

export async function serveHtmlPageWithReplacements(
    response: ServerResponse,
    filePath: string,
    replacements: Array<{ from: string; to: string }>,
    log?: BootstrapLog,
    logMetadata?: Record<string, unknown>,
    routeContext?: RouteContext,
): Promise<void> {
    try {
        let html = await readFile(filePath, "utf8");
        for (const replacement of replacements) {
            html = html.replaceAll(replacement.from, replacement.to);
        }
        routeContext?.setPageSecurityHeaders(response);
        response.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
        });
        response.end(html);
    } catch (error) {
        log?.("error", "Failed to serve UI asset.", {
            component: "api-ui",
            filePath,
            ...(logMetadata ?? {}),
            error: error instanceof Error ? error.message : String(error),
        });
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(
            "<!doctype html><html><body><h1>Not found</h1><p>Asset not found.</p></body></html>",
        );
    }
}
