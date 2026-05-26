import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
    isRoleAllowed,
    type BootstrapLog,
    type ModuleRuntimeGateway,
    type RoleAccessPolicy,
    type GatewayRegistry,
} from "@cognis/core";
import type { UIRegistry } from "../../ui-registry.js";
import type { LocalAccountStore } from "../../reuse/account-store.js";
import { parseRoleAccessPolicy } from "../../reuse/parse-role-access-policy.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";

const UI_ROOT = path.resolve(process.cwd(), "src", "ui");
const STATIC_ROOT = UI_ROOT;
const PUBLIC_ROOT = path.join(UI_ROOT, "public");
const MODULES_ROOT =
    process.env.COGNIS_MODULES_ROOT ??
    path.resolve(process.cwd(), "src", "modules");

interface ModuleUiRouteRule {
    path: string;
    access?: RoleAccessPolicy;
    invalidAccessPolicy?: boolean;
}

function parseModuleUiRoutes(raw: string): ModuleUiRouteRule[] {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((entry) => {
            if (typeof entry === "string") {
                return { path: entry } as ModuleUiRouteRule;
            }
            if (
                !entry ||
                typeof entry !== "object" ||
                Array.isArray(entry) ||
                typeof (entry as { path?: unknown }).path !== "string"
            ) {
                return null;
            }
            const parsedAccess = parseRoleAccessPolicy(
                (entry as { access?: unknown }).access,
            );
            return {
                path: (entry as { path: string }).path,
                access: parsedAccess.access,
                invalidAccessPolicy: parsedAccess.invalid,
            } as ModuleUiRouteRule;
        })
        .filter((entry): entry is ModuleUiRouteRule => Boolean(entry));
}

function resolveContentType(filePath: string) {
    const ext = path.extname(filePath);

    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".js") return "text/javascript; charset=utf-8";
    if (ext === ".webp") return "image/webp";
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".xml") return "application/xml; charset=utf-8";
    if (ext === ".svg") return "image/svg+xml; charset=utf-8";
    if (ext === ".webmanifest")
        return "application/manifest+json; charset=utf-8";
    if (ext === ".json") return "application/json; charset=utf-8";

    return "image/png";
}

async function serveStaticAsset(
    res: ServerResponse,
    filePath: string,
    contentType: string,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
    cacheControl: string = "no-store",
) {
    try {
        const file = await readFile(filePath);
        res.writeHead(200, {
            "content-type": contentType,
            "cache-control": cacheControl,
            "x-content-type-options": "nosniff",
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

async function serveFile(
    res: ServerResponse,
    filePath: string,
    contentType: string,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
    routeContext?: RouteContext,
) {
    try {
        const file = await readFile(filePath);
        routeContext?.setPageSecurityHeaders(res);
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

async function serveHtmlPage(
    res: ServerResponse,
    filePath: string,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
    routeContext?: RouteContext,
) {
    await serveFile(
        res,
        filePath,
        "text/html; charset=utf-8",
        log,
        logMeta,
        routeContext,
    );
}

async function serveHtmlPageWithReplacements(
    res: ServerResponse,
    filePath: string,
    replacements: Array<{ from: string; to: string }>,
    log?: BootstrapLog,
    logMeta?: Record<string, unknown>,
    routeContext?: RouteContext,
) {
    try {
        let html = await readFile(filePath, "utf8");
        // Replacements are literal string substitutions (no regex semantics).
        // Keep replacement "from" values non-overlapping to avoid cascading
        // substitutions across sequential replaceAll() calls. This list is
        // intentionally small (route-specific boilerplate adjustments only).
        for (const replacement of replacements) {
            html = html.replaceAll(replacement.from, replacement.to);
        }
        routeContext?.setPageSecurityHeaders(res);
        res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
        });
        res.end(html);
    } catch (error) {
        log?.("error", "Failed to serve UI asset.", {
            component: "api-ui",
            filePath,
            ...(logMeta ?? {}),
            error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(
            "<!doctype html><html><body><h1>Not found</h1><p>Asset not found.</p></body></html>",
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
    routeContext: RouteContext,
    accountStore?: LocalAccountStore,
    log?: BootstrapLog,
): Promise<string> {
    const cookieToken = getCookieAccessToken(req);
    const session = routeContext.getCookieSession(req);
    if (!cookieToken) {
        return "/login";
    }

    const tokenInfo = routeContext.lookupAccessToken(cookieToken);
    const accountId = session?.sub ?? tokenInfo?.sub ?? null;

    if (
        accountId &&
        accountStore &&
        typeof accountStore.getInfo === "function"
    ) {
        const info = await accountStore.getInfo(accountId).catch((error) => {
            log?.(
                "error",
                "Failed to read account info while resolving login redirect.",
                {
                    component: "api-ui",
                    accountId,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
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
        log?.(
            "error",
            "Failed to read active session account info while resolving login redirect.",
            {
                component: "api-ui",
                accountId: session.sub,
                error: error instanceof Error ? error.message : String(error),
            },
        );
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
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
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

        if (url.pathname === "/manifest.webmanifest" && req.method === "GET") {
            await serveStaticAsset(
                res,
                path.join(PUBLIC_ROOT, "manifest.webmanifest"),
                "application/manifest+json; charset=utf-8",
                log,
                { path: url.pathname, method: req.method },
                // Allow the browser HTTP cache and the service worker
                // stale-while-revalidate strategy to retain the manifest,
                // while still requiring revalidation on every use so updates
                // (icons, name, shortcuts) roll out promptly.
                "public, max-age=0, must-revalidate",
            );
            return true;
        }

        if (url.pathname === "/sw.js" && req.method === "GET") {
            try {
                const file = await readFile(path.join(PUBLIC_ROOT, "sw.js"));
                res.writeHead(200, {
                    "content-type": "text/javascript; charset=utf-8",
                    "cache-control": "no-cache",
                    "service-worker-allowed": "/",
                    "x-content-type-options": "nosniff",
                });
                res.end(file);
            } catch (error) {
                log?.("error", "Failed to serve service worker.", {
                    component: "api-ui",
                    path: url.pathname,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Service worker not found.",
                        },
                    }),
                );
            }
            return true;
        }

        if (url.pathname === "/dashboard") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "index.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/login") {
            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "login.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/settings") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "settings.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/administration") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            const session = ctx.getCookieSession(req);
            if (
                !session ||
                !isRoleAllowed(session.role, { minRole: "admin" })
            ) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }

            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "administration.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/users") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            const session = ctx.getCookieSession(req);
            if (!session) {
                res.writeHead(302, {
                    location: "/login?reason=session_expired",
                });
                res.end();
                return true;
            }
            if (!isRoleAllowed(session.role, { minRole: "admin" })) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }
            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "users.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/invite") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }
            const session = ctx.getCookieSession(req);
            if (!session) {
                res.writeHead(302, {
                    location: "/login?reason=session_expired",
                });
                res.end();
                return true;
            }
            if (isRoleAllowed(session.role, { onlyRole: "admin" })) {
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
            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "invite.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname.startsWith("/docs")) {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "docs.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname.startsWith("/changelogs")) {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveHtmlPageWithReplacements(
                res,
                path.join(PUBLIC_ROOT, "pages", "docs.html"),
                [
                    {
                        from: "{{ui.page.title.docs}}",
                        to: "{{ui.page.title.changelogs}}",
                    },
                    {
                        from: "/static/app/docs/index.js",
                        to: "/static/app/changelogs/index.js",
                    },
                ],
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/license") {
            const loginRedirect = await resolveLoginRedirectLocation(
                req,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                res.writeHead(302, { location: loginRedirect });
                res.end();
                return true;
            }

            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "license.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/error") {
            await serveHtmlPage(
                res,
                path.join(PUBLIC_ROOT, "pages", "error.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (runtime) {
            const manifests = await runtime.listManifests();

            for (const manifest of manifests) {
                if (isModuleEnabled && !isModuleEnabled(manifest.id)) continue;
                if (!manifest.entrypoints?.ui) continue;

                try {
                    const routeFile = path.resolve(
                        MODULES_ROOT,
                        manifest.id,
                        "routes.json",
                    );
                    if (url.pathname.startsWith("/api/")) continue;
                    const routes = parseModuleUiRoutes(
                        await readFile(routeFile, "utf8"),
                    );
                    const matchingRoute = routes.find(
                        (routeRule) => routeRule.path === url.pathname,
                    );
                    if (!matchingRoute) continue;
                    const loginRedirect = await resolveLoginRedirectLocation(
                        req,
                        ctx,
                        accountStore,
                        log,
                    );
                    if (loginRedirect) {
                        res.writeHead(302, { location: loginRedirect });
                        res.end();
                        return true;
                    }
                    if (matchingRoute.invalidAccessPolicy) {
                        log?.(
                            "warn",
                            "Blocked module UI route due to invalid access policy declaration.",
                            {
                                component: "api-ui",
                                moduleId: manifest.id,
                                path: url.pathname,
                            },
                        );
                        res.writeHead(302, { location: "/dashboard" });
                        res.end();
                        return true;
                    }
                    const session = ctx.getCookieSession(req);
                    if (
                        matchingRoute.access &&
                        !isRoleAllowed(session.role, matchingRoute.access)
                    ) {
                        res.writeHead(302, { location: "/dashboard" });
                        res.end();
                        return true;
                    }
                    const uiFile = path.resolve(
                        MODULES_ROOT,
                        manifest.id,
                        manifest.entrypoints.ui,
                    );
                    await serveHtmlPage(
                        res,
                        uiFile,
                        log,
                        {
                            path: url.pathname,
                            method: req.method ?? "GET",
                            moduleId: manifest.id,
                        },
                        ctx,
                    );
                    return true;
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
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const pageId = decodeURIComponent(pageExtMatch[1]);
            const extensions = (
                uiRegistry?.listPageExtensions(pageId) ?? []
            ).filter(
                (extension) =>
                    (!extension.isEnabled || extension.isEnabled()) &&
                    isRoleAllowed(claims.role, extension.access),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: extensions }));
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/auth-typing-messages" &&
            req.method === "GET"
        ) {
            const viewerSession = ctx.getCookieSession(req);
            const gatewayMessages = (uiRegistry?.listAuthTypingMessages() ?? [])
                .filter((message) => {
                    if (message.isEnabled && !message.isEnabled()) {
                        return false;
                    }
                    if (
                        message.access &&
                        (!viewerSession ||
                            !isRoleAllowed(viewerSession.role, message.access))
                    ) {
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
            url.pathname === "/api/v1/ui/settings-sections" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const sections = (uiRegistry?.listSettingsSections() ?? []).filter(
                (section) =>
                    (!section.isEnabled || section.isEnabled()) &&
                    isRoleAllowed(claims.role, section.access),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: sections,
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/navbar-plugins" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const plugins = (uiRegistry?.listNavbarPlugins() ?? []).filter(
                (plugin) =>
                    (!plugin.isEnabled || plugin.isEnabled()) &&
                    isRoleAllowed(claims.role, plugin.access),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: plugins }));
            return true;
        }

        if (url.pathname === "/api/v1/ui/app-routes" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const routes = (uiRegistry?.listSpaRoutes() ?? []).filter(
                (route) =>
                    (!route.isEnabled || route.isEnabled()) &&
                    isRoleAllowed(claims.role, route.access),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: routes }));
            return true;
        }

        if (url.pathname.startsWith("/static/adapters/")) {
            const rest = url.pathname.slice("/static/adapters/".length);
            const parts = rest.split("/");
            if (parts.length >= 3) {
                const gatewayId = parts[0];
                const adapterId = parts[1];
                const filePart = parts.slice(2).join("/");
                const dir = uiRegistry?.getAdapterStaticDir(
                    gatewayId,
                    adapterId,
                );
                if (
                    dir &&
                    /^[a-zA-Z0-9_./-]+$/.test(filePart) &&
                    !filePart.includes("..")
                ) {
                    await serveFile(
                        res,
                        path.join(dir, filePart),
                        resolveContentType(filePart),
                        undefined,
                        undefined,
                        ctx,
                    );
                    return true;
                }
            }
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_found",
                        message: "Adapter asset not found.",
                    },
                }),
            );
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
                        undefined,
                        undefined,
                        ctx,
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

        if (url.pathname.startsWith("/static/modules/")) {
            const urlPath = url.pathname.slice("/static/modules/".length);
            if (
                !urlPath ||
                !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(urlPath) ||
                urlPath.includes("..") ||
                urlPath.includes("//") ||
                urlPath.split("/").some((segment) => segment.startsWith("."))
            ) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Module asset not found.",
                        },
                    }),
                );
                return true;
            }
            const resolved = uiRegistry?.resolveModulePath(urlPath);
            if (resolved) {
                await serveFile(
                    res,
                    path.join(resolved.dir, resolved.relPath),
                    resolveContentType(resolved.relPath),
                    undefined,
                    undefined,
                    ctx,
                );
                return true;
            }
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_found",
                        message: "Module asset not found.",
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

        if (relative === null) {
            if (!url.pathname.startsWith("/api/") && req.method === "GET") {
                const requestedCode = Number(
                    url.searchParams.get("code") ?? "",
                );
                const errorCode =
                    Number.isInteger(requestedCode) &&
                    requestedCode >= 400 &&
                    requestedCode <= 599
                        ? String(requestedCode)
                        : "404";
                res.writeHead(302, { location: `/error?code=${errorCode}` });
                res.end();
                return true;
            }
            return false;
        }

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

        await serveFile(
            res,
            filePath,
            resolveContentType(filePath),
            undefined,
            undefined,
            ctx,
        );
        return true;
    };
}
