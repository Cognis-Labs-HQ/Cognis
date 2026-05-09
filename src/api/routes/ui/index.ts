import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
    requireAuth,
    getCookieSession,
    setPageSecurityHeaders,
} from "../../auth/guard.js";
import { lookupAccessToken } from "../../auth/access-tokens.js";
import type { BootstrapLog, ModuleRuntimeGateway } from "@cognis/core";
import type { GatewayRegistry } from "@cognis/core";
import type { UIRegistry } from "../../ui-registry.js";
import type { LocalAccountStore } from "../../reuse/account-store.js";

const UI_ROOT = path.resolve(process.cwd(), "src", "ui");
const STATIC_ROOT = UI_ROOT;
const PUBLIC_ROOT = path.join(UI_ROOT, "public");
const MODULES_ROOT =
    process.env.COGNIS_MODULES_ROOT ??
    path.resolve(process.cwd(), "src", "modules");

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

async function serveFile(
    res: ServerResponse,
    filePath: string,
    contentType: string,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
) {
    try {
        const file = await readFile(filePath);
        setPageSecurityHeaders(res);
        res.writeHead(200, {
            "content-type": contentType,
            "cache-control": "no-store",
        });
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

function getCookieAccessToken(req: IncomingMessage): string | null {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|; )cognis_access_token=([^;]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
}

async function resolveLoginRedirectLocation(
    req: IncomingMessage,
    accountStore?: LocalAccountStore,
    log?: BootstrapLog,
): Promise<string> {
    const cookieToken = getCookieAccessToken(req);
    const session = getCookieSession(req);
    if (!cookieToken) {
        return "/login";
    }

    const tokenInfo = lookupAccessToken(cookieToken);
    const accountId = session?.sub ?? tokenInfo?.sub ?? null;

    if (
        accountId &&
        accountStore &&
        typeof accountStore.getInfo === "function"
    ) {
        const info = await accountStore.getInfo(accountId).catch((error) => {
            log?.("error", "Failed to read account info while resolving login redirect.", {
                component: "api-ui",
                accountId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        });
        if (!info) return "/login?reason=account_deleted";
        if (info.enabled === false) return "/login?reason=account_disabled";
    }

    if (!session || !tokenInfo || tokenInfo.revoked) {
        return "/login?reason=session_expired";
    }

    if (!accountStore || typeof accountStore.getInfo !== "function") return "";
    const info = await accountStore.getInfo(session.sub).catch((error) => {
        log?.("error", "Failed to read active session account info while resolving login redirect.", {
            component: "api-ui",
            accountId: session.sub,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    });
    if (!info) return "/login?reason=account_deleted";
    if (info.enabled === false) return "/login?reason=account_disabled";
    return "";
}

export function createUiRoutes(
    runtime?: ModuleRuntimeGateway,
    uiRegistry?: UIRegistry,
    accountStore?: LocalAccountStore,
    gatewayRegistry?: GatewayRegistry,
    isModuleEnabled?: (moduleId: string) => boolean,
    log?: BootstrapLog,
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
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "index.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/login") {
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "login.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/verify-email") {
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "verify-email.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/settings") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "settings.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/administration") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            if (getCookieSession(req)?.role !== "admin") {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "administration.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/modules") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            if (getCookieSession(req)?.role !== "admin") {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }

            res.writeHead(302, { location: "/administration" });
            res.end();
            return true;
        }

        if (url.pathname === "/users") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            const session = getCookieSession(req);
            if (!session) {
                res.writeHead(302, {
                    location: "/login?reason=session_expired",
                });
                res.end();
                return true;
            }
            if (session.role !== "admin") {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "users.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/invite") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            const session = getCookieSession(req);
            if (!session) {
                res.writeHead(302, {
                    location: "/login?reason=session_expired",
                });
                res.end();
                return true;
            }
            if (session.role === "admin") {
                res.writeHead(302, { location: "/users" });
                res.end();
                return true;
            }
            const registrationGateway = gatewayRegistry?.get("registration");
            if (
                !registrationGateway ||
                registrationGateway.status === "disabled"
            ) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }
            const isFounder = accountStore
                ? await accountStore.isFounder(session.sub).catch((error) => {
                      log?.(
                          "error",
                          "Failed to resolve founder status for invite route access.",
                          {
                              component: "api-ui",
                              accountId: session.sub,
                              error:
                                  error instanceof Error
                                      ? error.message
                                      : String(error),
                          },
                      );
                      return false;
                  })
                : false;
            if (!isFounder) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }
            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "invite.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname.startsWith("/docs")) {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "docs.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (url.pathname === "/license") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveFile(
                res,
                path.join(PUBLIC_ROOT, "pages", "license.html"),
                "text/html; charset=utf-8",
                log,
                { path: url.pathname, method: req.method ?? "GET" },
            );
            return true;
        }

        if (runtime && getCookieSession(req)) {
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
                            log,
                            {
                                path: url.pathname,
                                method: req.method ?? "GET",
                                moduleId: manifest.id,
                            },
                        );
                        return true;
                    }
                } catch (error) {
                    log?.(
                        "error",
                        "Failed to resolve module UI route declarations.",
                        {
                            component: "api-ui",
                            moduleId: manifest.id,
                            path: url.pathname,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            }
        }

        const pageExtMatch = url.pathname.match(
            /^\/api\/v1\/ui\/page-extensions\/([^/]+)$/,
        );
        if (pageExtMatch && req.method === "GET") {
            if (!requireAuth(req, res, "user")) return true;
            const pageId = decodeURIComponent(pageExtMatch[1]);
            const extensions = uiRegistry?.listPageExtensions(pageId) ?? [];
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: extensions }));
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/auth-typing-messages" &&
            req.method === "GET"
        ) {
            const gatewayMessages = (uiRegistry?.listAuthTypingMessages() ?? [])
                .filter((message) => {
                    if (message.isEnabled && !message.isEnabled()) {
                        return false;
                    }
                    if (
                        message.ownerType === "gateway" &&
                        message.ownerId &&
                        gatewayRegistry?.get(message.ownerId)?.status ===
                            "disabled"
                    ) {
                        return false;
                    }
                    if (
                        message.ownerType === "module" &&
                        message.ownerId &&
                        isModuleEnabled &&
                        !isModuleEnabled(message.ownerId)
                    ) {
                        return false;
                    }
                    return true;
                })
                .map(({ id, textKey, ownerType, ownerId }) => ({
                    id,
                    textKey,
                    ownerType,
                    ownerId,
                }));
            const moduleMessages = runtime
                ? (await runtime.listManifests())
                      .filter((manifest) =>
                          isModuleEnabled ? isModuleEnabled(manifest.id) : true,
                      )
                      .flatMap((manifest) =>
                          (manifest.ui?.authTypingMessages ?? []).map(
                              (textKey, index) => ({
                                  id: `${manifest.id}:${index}`,
                                  textKey,
                                  ownerType: "module",
                                  ownerId: manifest.id,
                              }),
                          ),
                      )
                : [];
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: [...gatewayMessages, ...moduleMessages],
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/navbar-plugins" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "user")) return true;
            const plugins = uiRegistry?.listNavbarPlugins() ?? [];
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: plugins }));
            return true;
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

        let relative: string | null = null;

        if (url.pathname.startsWith("/assets/")) {
            relative = `assets/${url.pathname.slice("/assets/".length)}`;
        } else if (url.pathname.startsWith("/static/")) {
            relative = url.pathname.replace("/static/", "");
        }

        if (relative === null) return false;

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
