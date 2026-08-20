import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
    isRoleAllowed,
    type BootstrapLog,
    type LocalAccountStore,
    type ModuleManifest,
    type ModuleRuntimeGateway,
    type GatewayRegistry,
} from "@cognis/core";
import type { UIRegistry } from "../../reuse/ui-registry.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import {
    parseModuleUiRoutes,
    type ModuleUiRouteRule,
    type SettingsSectionVisibilityCheck,
} from "./route-rules.js";
import {
    resolveContentType,
    serveStaticAsset,
} from "../../reuse/static-asset-response.js";
import * as htmlResponse from "../../reuse/html-response.js";
import { handleRegisteredSpaPage } from "./spa-pages.js";
import { versionDescriptor } from "./asset-versioning.js";
import { serveProviders } from "./capability-providers.js";
import {
    resolveModuleRoot,
    serveDeclaredModuleStrings,
} from "./module-string-assets.js";
const UI_ROOT = path.resolve(process.cwd(), "src", "ui");
const STATIC_ROOT = UI_ROOT;
const PUBLIC_ROOT = path.join(UI_ROOT, "public");
const PRODUCTION_UI_ROOT = path.resolve(
    process.env.COGNIS_UI_DIST_ROOT ?? path.join(process.cwd(), "dist", "ui"),
);
const PRODUCTION_PUBLIC_ROOT = path.join(PRODUCTION_UI_ROOT, "public");
const IS_PRODUCTION_BUILD = Boolean(process.env.COGNIS_UI_ASSET_MANIFEST);
const SERVED_PUBLIC_ROOT = IS_PRODUCTION_BUILD
    ? PRODUCTION_PUBLIC_ROOT
    : PUBLIC_ROOT;
const ASSET_VERSION = process.env.COGNIS_ASSET_VERSION ?? "development";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const REVALIDATED_CACHE_CONTROL = "public, max-age=0, must-revalidate";

async function serveVersionedAsset(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    filePath: string,
    contentType: string,
    routeContext?: RouteContext,
) {
    routeContext?.setPageSecurityHeaders(res);
    const isVersioned = url.searchParams.get("v") === ASSET_VERSION;
    await serveStaticAsset(
        req,
        res,
        filePath,
        contentType,
        undefined,
        undefined,
        isVersioned ? IMMUTABLE_CACHE_CONTROL : REVALIDATED_CACHE_CONTROL,
    );
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

function sendRedirect(res: ServerResponse, location: string): true {
    res.writeHead(302, { location });
    res.end();
    return true;
}

function isSettingsSectionVisible(
    section: SettingsSectionVisibilityCheck,
    role: string,
): boolean {
    return (
        (!section.isEnabled || section.isEnabled()) &&
        isRoleAllowed(role, section.access)
    );
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

        if (
            url.pathname === "/api/v1/ui/asset-manifest" &&
            req.method === "GET"
        ) {
            res.writeHead(200, {
                "content-type": "application/json; charset=utf-8",
                "cache-control": REVALIDATED_CACHE_CONTROL,
            });
            res.end(
                JSON.stringify({
                    data: {
                        version: ASSET_VERSION,
                        queryParameter: "v",
                        immutableCacheControl: IMMUTABLE_CACHE_CONTROL,
                        assets: uiRegistry?.listAssetManifest() ?? {},
                    },
                }),
            );
            return true;
        }

        if (url.pathname === "/manifest.webmanifest" && req.method === "GET") {
            await serveStaticAsset(
                req,
                res,
                path.join(SERVED_PUBLIC_ROOT, "manifest.webmanifest"),
                "application/manifest+json; charset=utf-8",
                log,
                { path: url.pathname, method: req.method },
                // Let browser and service-worker caches retain the manifest,
                // while revalidation rolls out icon, name, and shortcut updates.
                "public, max-age=0, must-revalidate",
            );
            return true;
        }

        if (url.pathname === "/sw.js" && req.method === "GET") {
            try {
                const file = await readFile(
                    path.join(SERVED_PUBLIC_ROOT, "sw.js"),
                );
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

            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "index.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/login") {
            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "login.html"),
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

            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "settings.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (/^\/administration(?:\/modules(?:\/[^/]+)?)?$/.test(url.pathname)) {
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

            const administrationPage = url.pathname.startsWith(
                "/administration/modules",
            )
                ? "modules.html"
                : "administration.html";
            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", administrationPage),
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
            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "users.html"),
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
            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "invite.html"),
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

            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "docs.html"),
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

            await htmlResponse.serveHtmlPageWithReplacements(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "docs.html"),
                [
                    {
                        from: "{{ui.page.title.docs}}",
                        to: "{{ui.page.title.changelogs}}",
                    },
                    {
                        from:
                            uiRegistry?.resolveAssetUrl(
                                "/static/app/docs/index.js",
                            ) ?? "/static/app/docs/index.js",
                        to:
                            uiRegistry?.resolveAssetUrl(
                                "/static/app/changelogs/index.js",
                            ) ?? "/static/app/changelogs/index.js",
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

            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "license.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/error") {
            await htmlResponse.serveHtmlPage(
                res,
                path.join(SERVED_PUBLIC_ROOT, "pages", "error.html"),
                log,
                { path: url.pathname, method: req.method ?? "GET" },
                ctx,
            );
            return true;
        }

        const registeredSpaRoute = versionDescriptor(
            uiRegistry?.resolveSpaRoute(url.pathname),
            ASSET_VERSION,
        );
        if (
            uiRegistry &&
            (await handleRegisteredSpaPage({
                req,
                res,
                route: registeredSpaRoute,
                uiRegistry,
                publicRoot: SERVED_PUBLIC_ROOT,
                routeContext: ctx,
                log,
                resolveLoginRedirect: () =>
                    resolveLoginRedirectLocation(req, ctx, accountStore, log),
                redirect: (location) => sendRedirect(res, location),
                getSessionRole: () => ctx.getCookieSession(req)?.role,
            }))
        ) {
            return true;
        }

        if (runtime && !url.pathname.startsWith("/api/")) {
            const manifests = await runtime.listManifests();

            for (const manifest of manifests) {
                if (
                    !manifest.entrypoints?.ui ||
                    (isModuleEnabled && !isModuleEnabled(manifest.id))
                )
                    continue;

                try {
                    const moduleRoot = await resolveModuleRoot(manifest);
                    const routeFile = path.resolve(moduleRoot, "routes.json");
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
                    if (loginRedirect) return sendRedirect(res, loginRedirect);
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
                        return sendRedirect(res, "/dashboard");
                    }
                    const session = ctx.getCookieSession(req);
                    if (
                        matchingRoute.access &&
                        !isRoleAllowed(session.role, matchingRoute.access)
                    ) {
                        return sendRedirect(res, "/dashboard");
                    }
                    const uiFile = path.resolve(
                        moduleRoot,
                        manifest.entrypoints.ui,
                    );
                    await htmlResponse.serveHtmlPage(
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
            let sections: unknown[];
            if (ctx.flow.exists("construct-settings-ui")) {
                const result = await ctx.flow.run(
                    "construct-settings-ui",
                    undefined,
                    {
                        meta: { uiRegistry },
                    },
                );
                const flowSections = result.data["sections"] as
                    unknown[] | undefined;
                sections = (flowSections ?? []).filter((section) =>
                    isSettingsSectionVisible(
                        section as {
                            isEnabled?: () => boolean;
                            access?: never;
                        },
                        claims.role,
                    ),
                );
            } else {
                sections = (uiRegistry?.listSettingsSections() ?? []).filter(
                    (section) => isSettingsSectionVisible(section, claims.role),
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: versionDescriptor(sections, ASSET_VERSION),
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
            res.end(
                JSON.stringify({
                    data: versionDescriptor(plugins, ASSET_VERSION),
                }),
            );
            return true;
        }

        if (serveProviders(req, res, url, ctx, uiRegistry, ASSET_VERSION))
            return true;

        if (url.pathname === "/api/v1/ui/app-routes" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const routes = (uiRegistry?.listSpaRoutes() ?? []).filter(
                (route) =>
                    (!route.isEnabled || route.isEnabled()) &&
                    isRoleAllowed(claims.role, route.access),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: versionDescriptor(routes, ASSET_VERSION),
                }),
            );
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
                    await serveVersionedAsset(
                        req,
                        res,
                        url,
                        path.join(dir, filePart),
                        resolveContentType(filePart),
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
                    await serveVersionedAsset(
                        req,
                        res,
                        url,
                        path.join(dir, filePart),
                        resolveContentType(filePart),
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
                await serveVersionedAsset(
                    req,
                    res,
                    url,
                    path.join(resolved.dir, resolved.relPath),
                    resolveContentType(resolved.relPath),
                    ctx,
                );
                return true;
            }
            if (
                await serveDeclaredModuleStrings(
                    req,
                    res,
                    url,
                    urlPath,
                    runtime,
                    ctx,
                )
            )
                return true;
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

        if (IS_PRODUCTION_BUILD && url.pathname.startsWith("/assets/")) {
            const relativeAssetPath = url.pathname.slice(1);
            if (
                /^[a-zA-Z0-9_./-]+$/.test(relativeAssetPath) &&
                !relativeAssetPath.includes("..")
            ) {
                await serveStaticAsset(
                    req,
                    res,
                    path.join(PRODUCTION_UI_ROOT, relativeAssetPath),
                    resolveContentType(relativeAssetPath),
                    log,
                    { path: url.pathname, method: req.method },
                    IMMUTABLE_CACHE_CONTROL,
                );
                return true;
            }
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
                ? path.join(SERVED_PUBLIC_ROOT, relative)
                : path.join(STATIC_ROOT, relative);

        await serveVersionedAsset(
            req,
            res,
            url,
            filePath,
            resolveContentType(filePath),
            ctx,
        );
        return true;
    };
}
