import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
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

function acceptedEncodingQuality(header: string, encoding: string): number {
    const qualityByEncoding = new Map<string, number>();
    for (const value of header.split(",")) {
        const [coding, ...parameters] = value.trim().toLowerCase().split(";");
        if (!coding) continue;
        const qualityParameter = parameters.find((parameter) =>
            parameter.trim().startsWith("q="),
        );
        const parsedQuality = qualityParameter
            ? Number(qualityParameter.trim().slice(2))
            : 1;
        qualityByEncoding.set(
            coding,
            Number.isFinite(parsedQuality) &&
                parsedQuality >= 0 &&
                parsedQuality <= 1
                ? parsedQuality
                : 0,
        );
    }
    return (
        qualityByEncoding.get(encoding) ??
        qualityByEncoding.get("*") ??
        (encoding === "identity" ? 1 : 0)
    );
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
        const brotliPath = `${filePath}.br`;
        const gzipPath = `${filePath}.gz`;
        const availableEncodings = [
            { name: "br", path: brotliPath },
            { name: "gzip", path: gzipPath },
        ]
            .filter(
                ({ name, path: compressedAssetPath }) =>
                    acceptedEncodingQuality(acceptedEncoding, name) > 0 &&
                    existsSync(compressedAssetPath),
            )
            .sort(
                (left, right) =>
                    acceptedEncodingQuality(acceptedEncoding, right.name) -
                    acceptedEncodingQuality(acceptedEncoding, left.name),
            );
        const encoding = availableEncodings[0]?.name;
        if (
            !encoding &&
            acceptedEncodingQuality(acceptedEncoding, "identity") === 0
        ) {
            res.writeHead(406, {
                "content-type": "application/json",
                vary: "Accept-Encoding",
            });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_acceptable",
                        message: "No acceptable asset encoding is available.",
                    },
                }),
            );
            return;
        }
        const compressedPath = encoding
            ? encoding === "br"
                ? brotliPath
                : gzipPath
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
        res.writeHead(404, {
            "content-type": "application/json",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
        });
        res.end(
            JSON.stringify({
                error: { code: "not_found", message: "Asset not found." },
            }),
        );
    }
}
