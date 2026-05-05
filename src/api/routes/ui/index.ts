import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyAccessToken } from "../../auth/access-tokens.js";
import type { ModuleRuntimeGateway } from "@cognis/core";
import type { UIRegistry } from "../../ui-registry.js";

const UI_ROOT = path.resolve(process.cwd(), "src", "ui");
const STATIC_ROOT = UI_ROOT;
const PUBLIC_ROOT = path.join(UI_ROOT, "public");
const MODULES_ROOT =
    process.env.COGNIS_MODULES_ROOT ??
    path.resolve(process.cwd(), "src", "modules");

function setSecurityHeaders(res: ServerResponse) {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader(
        "content-security-policy",
        "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'",
    );
}

function resolveContentType(filePath: string) {
    const ext = path.extname(filePath);

    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".js") return "text/javascript; charset=utf-8";
    if (ext === ".webp") return "image/webp";
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".xml") return "application/xml; charset=utf-8";
    if (ext === ".svg") return "image/svg+xml; charset=utf-8";

    return "image/png";
}

function getCookie(req: IncomingMessage, name: string) {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function getSessionClaims(req: IncomingMessage) {
    const token = getCookie(req, "cognis_access_token");
    return token ? verifyAccessToken(token) : null;
}

function isLoggedIn(req: IncomingMessage) {
    return Boolean(getSessionClaims(req));
}

function isAdmin(req: IncomingMessage) {
    return getSessionClaims(req)?.role === "admin";
}

async function serveFile(
    res: ServerResponse,
    filePath: string,
    contentType: string,
) {
    try {
        const file = await readFile(filePath);
        setSecurityHeaders(res);
        res.writeHead(200, {
            "content-type": contentType,
            "cache-control": "no-store",
        });
        res.end(file);
    } catch {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: { code: "not_found", message: "Asset not found." },
            }),
        );
    }
}

export function createUiRoutes(
    runtime?: ModuleRuntimeGateway,
    uiRegistry?: UIRegistry,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/") {
            res.writeHead(302, { location: "/dashboard" });
            res.end();
            return true;
        }

        if (url.pathname === "/dashboard") {
            if (!isLoggedIn(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "index.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (url.pathname === "/login") {
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "login.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (url.pathname === "/verify-email") {
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "verify-email.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (url.pathname === "/settings") {
            if (!isLoggedIn(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "settings.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (url.pathname === "/administration") {
            if (!isLoggedIn(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            if (!isAdmin(req)) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "administration.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (url.pathname === "/modules") {
            if (!isLoggedIn(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            if (!isAdmin(req)) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }

            res.writeHead(302, { location: "/administration" });
            res.end();
            return true;
        }

        if (url.pathname === "/docs") {
            if (!isLoggedIn(req)) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "docs.html"),
                "text/html; charset=utf-8",
            );
            return true;
        }

        if (runtime && isLoggedIn(req)) {
            const manifests = await runtime.listManifests();

            for (const manifest of manifests) {
                if (!manifest.entrypoints?.ui) continue;

                try {
                    const routeFile = path.resolve(
                        MODULES_ROOT,
                        manifest.id,
                        "routes.json",
                    );
                    const routes = JSON.parse(
                        await readFile(routeFile, "utf8"),
                    ) as string[];

                    if (
                        routes.includes(url.pathname) &&
                        !url.pathname.startsWith("/api/")
                    ) {
                        const uiFile = path.resolve(
                            MODULES_ROOT,
                            manifest.id,
                            manifest.entrypoints.ui,
                        );
                        await serveFile(
                            res,
                            uiFile,
                            "text/html; charset=utf-8",
                        );
                        return true;
                    }
                } catch {
                    // ignore missing/invalid module route declarations
                }
            }
        }

        if (url.pathname.startsWith("/static/gateways/")) {
            const rest = url.pathname.slice("/static/gateways/".length);
            const slashIdx = rest.indexOf("/");
            if (slashIdx > 0) {
                const gatewayId = rest.slice(0, slashIdx);
                const filePart = rest.slice(slashIdx + 1);
                const dir = uiRegistry?.getStaticDir(gatewayId);
                if (
                    dir &&
                    /^[a-zA-Z0-9_./-]+$/.test(filePart) &&
                    !filePart.includes("..")
                ) {
                    await serveFile(
                        res,
                        path.join(dir, filePart),
                        resolveContentType(filePart),
                    );
                    return true;
                }
            }
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_found",
                        message: "Gateway asset not found.",
                    },
                }),
            );
            return true;
        }

        if (!url.pathname.startsWith("/static/")) return false;

        const relative = url.pathname.replace("/static/", "");
        if (!/^[a-zA-Z0-9_./-]+$/.test(relative) || relative.includes("..")) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "bad_request", message: "Invalid path." },
                }),
            );
            return true;
        }

        const filePath =
            relative.startsWith("assets/") || relative.startsWith("templates/")
                ? path.join(PUBLIC_ROOT, relative)
                : path.join(STATIC_ROOT, relative);

        await serveFile(res, filePath, resolveContentType(filePath));
        return true;
    };
}
