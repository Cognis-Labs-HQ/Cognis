import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { BootstrapLog } from "@cognis/core";

export function resolveContentType(filePath: string): string {
    const extension = path.extname(filePath);
    if (extension === ".css") return "text/css; charset=utf-8";
    if (extension === ".js" || extension === ".mjs") {
        return "text/javascript; charset=utf-8";
    }
    if (extension === ".webp") return "image/webp";
    if (extension === ".html") return "text/html; charset=utf-8";
    if (extension === ".xml") return "application/xml; charset=utf-8";
    if (extension === ".svg") return "image/svg+xml; charset=utf-8";
    if (extension === ".webmanifest") {
        return "application/manifest+json; charset=utf-8";
    }
    if (extension === ".json") return "application/json; charset=utf-8";
    return "image/png";
}

export async function serveStaticAsset(
    req: IncomingMessage,
    res: ServerResponse,
    filePath: string,
    contentType: string,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
    cacheControl = "no-store",
): Promise<void> {
    try {
        const acceptedEncoding = req.headers["accept-encoding"] ?? "";
        const encoding = acceptedEncoding.includes("br")
            ? "br"
            : acceptedEncoding.includes("gzip")
              ? "gzip"
              : undefined;
        const compressedPath = encoding
            ? `${filePath}.${encoding === "br" ? "br" : "gz"}`
            : filePath;
        const metadata = await stat(compressedPath);
        if (!metadata.isFile()) throw new Error("Asset path is not a file.");
        const etag = `W/\"${metadata.size.toString(16)}-${Math.trunc(metadata.mtimeMs).toString(16)}\"`;
        const headers = {
            "content-type": contentType,
            "cache-control": cacheControl,
            etag,
            "last-modified": metadata.mtime.toUTCString(),
            "x-content-type-options": "nosniff",
            vary: "Accept-Encoding",
            ...(encoding ? { "content-encoding": encoding } : {}),
        };
        if (
            req.headers["if-none-match"] === etag ||
            (!req.headers["if-none-match"] &&
                req.headers["if-modified-since"] &&
                Date.parse(req.headers["if-modified-since"]) >=
                    Math.trunc(metadata.mtimeMs / 1000) * 1000)
        ) {
            res.writeHead(304, headers);
            res.end();
            return;
        }
        const file = await readFile(compressedPath);
        res.writeHead(200, { ...headers, "content-length": file.length });
        res.end(file);
    } catch (error) {
        log?.("error", "Failed to serve UI asset.", {
            component: "api-ui",
            filePath,
            ...(logMeta ?? {}),
            error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(404, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: { code: "not_found", message: "Asset not found." },
            }),
        );
    }
}
