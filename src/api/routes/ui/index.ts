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
import {
    versionDescriptor,
    createVersionedAssetServer,
    IMMUTABLE_CACHE_CONTROL,
    REVALIDATED_CACHE_CONTROL,
} from "./asset-versioning.js";
import { serveProviders } from "./capability-providers.js";
import { resolveLoginRedirectLocation } from "./access.js";
import {
    resolveModuleRoot,
    serveDeclaredModuleStrings,
    serveEnabledModuleAsset,
    validateModuleAssetRevision,
    uiStaticPath as staticPath,
} from "./module-string-assets.js";
const UI_ROOT = path.resolve(process.cwd(), "src", "ui");
const STATIC_ROOT = UI_ROOT;
const PRODUCTION_UI_ROOT = path.resolve(
    process.env.COGNIS_UI_DIST_ROOT ?? path.join(process.cwd(), "dist", "ui"),
);
const PRODUCTION_PUBLIC_ROOT = path.join(PRODUCTION_UI_ROOT, "public");
const IS_PRODUCTION_BUILD = Boolean(process.env.COGNIS_UI_ASSET_MANIFEST);
const SERVED_PUBLIC_ROOT = IS_PRODUCTION_BUILD
    ? PRODUCTION_PUBLIC_ROOT
    : path.join(UI_ROOT, "public");
const ASSET_VERSION = process.env.COGNIS_ASSET_VERSION ?? "development";
const serveVersionedAsset = createVersionedAssetServer(ASSET_VERSION);

function sendRedirect(response: ServerResponse, location: string): true {
    response.writeHead(302, { location });
    response.end();
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
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/") {
            response.writeHead(302, { location: "/dashboard" });
            response.end();
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/asset-manifest" &&
            request.method === "GET"
        ) {
            response.writeHead(200, {
                "content-type": "application/json; charset=utf-8",
                "cache-control": REVALIDATED_CACHE_CONTROL,
            });
            response.end(
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

        const builtTranslation =
            IS_PRODUCTION_BUILD &&
            /\/languages\/[^/]+\/strings\.xml$/.test(url.pathname)
                ? uiRegistry?.resolveAssetUrl(url.pathname)
                : undefined;
        if (
            builtTranslation &&
            /^\/assets\/locale-[A-Z0-9]{8}\.xml$/.test(builtTranslation)
        ) {
            await serveVersionedAsset(
                request,
                response,
                url,
                path.join(PRODUCTION_UI_ROOT, builtTranslation.slice(1)),
                "application/xml; charset=utf-8",
                ctx,
            );
            return true;
        }

        if (
            url.pathname === "/manifest.webmanifest" &&
            request.method === "GET"
        ) {
            await serveStaticAsset(
                request,
                response,
                path.join(SERVED_PUBLIC_ROOT, "manifest.webmanifest"),
                "application/manifest+json; charset=utf-8",
                log,
                { path: url.pathname, method: request.method },
                // Let browser and service-worker caches retain the manifest,
                // while revalidation rolls out icon, name, and shortcut updates.
                "public, max-age=0, must-revalidate",
            );
            return true;
        }

        if (url.pathname === "/sw.js" && request.method === "GET") {
            try {
                const file = await readFile(
                    path.join(SERVED_PUBLIC_ROOT, "sw.js"),
                );
                response.writeHead(200, {
                    "content-type": "text/javascript; charset=utf-8",
                    "cache-control": "no-cache",
                    "service-worker-allowed": "/",
                    "x-content-type-options": "nosniff",
                });
                response.end(file);
            } catch (error) {
                log?.("error", "Failed to serve service worker.", {
                    component: "api-ui",
                    path: url.pathname,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }

            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "index.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/settings") {
            const loginRedirect = await resolveLoginRedirectLocation(
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }

            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "settings.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (/^\/administration(?:\/modules(?:\/[^/]+)?)?$/.test(url.pathname)) {
            const loginRedirect = await resolveLoginRedirectLocation(
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }
            const session = ctx.getCookieSession(request);
            if (
                !session ||
                !isRoleAllowed(session.role, { minRole: "admin" })
            ) {
                response.writeHead(302, { location: "/dashboard" });
                response.end();
                return true;
            }

            const administrationPage = url.pathname.startsWith(
                "/administration/modules",
            )
                ? "modules.html"
                : "administration.html";
            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", administrationPage),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/users") {
            const loginRedirect = await resolveLoginRedirectLocation(
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }
            const session = ctx.getCookieSession(request);
            if (!session) {
                response.writeHead(302, {
                    location: "/login?reason=session_expired",
                });
                response.end();
                return true;
            }
            if (!isRoleAllowed(session.role, { minRole: "admin" })) {
                response.writeHead(302, { location: "/dashboard" });
                response.end();
                return true;
            }
            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "users.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname.startsWith("/docs")) {
            const loginRedirect = await resolveLoginRedirectLocation(
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }

            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "docs.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname.startsWith("/changelogs")) {
            const loginRedirect = await resolveLoginRedirectLocation(
                request,
                ctx,
                accountStore,
                log,
            );
            if (loginRedirect) {
                response.writeHead(302, { location: loginRedirect });
                response.end();
                return true;
            }

            await htmlResponse.serveHtmlPageWithReplacements(
                response,
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
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/license") {
            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "license.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
                ctx,
            );
            return true;
        }

        if (url.pathname === "/error") {
            await htmlResponse.serveHtmlPage(
                response,
                path.join(SERVED_PUBLIC_ROOT, "pages", "error.html"),
                log,
                { path: url.pathname, method: request.method ?? "GET" },
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
                req: request,
                res: response,
                route: registeredSpaRoute,
                uiRegistry,
                publicRoot: SERVED_PUBLIC_ROOT,
                routeContext: ctx,
                log,
                resolveLoginRedirect: () =>
                    resolveLoginRedirectLocation(
                        request,
                        ctx,
                        accountStore,
                        log,
                    ),
                redirect: (location) => sendRedirect(response, location),
                getSessionRole: () => ctx.getCookieSession(request)?.role,
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
                        request,
                        ctx,
                        accountStore,
                        log,
                    );
                    if (loginRedirect)
                        return sendRedirect(response, loginRedirect);
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
                        return sendRedirect(response, "/dashboard");
                    }
                    const session = ctx.getCookieSession(request);
                    if (
                        matchingRoute.access &&
                        !isRoleAllowed(session.role, matchingRoute.access)
                    ) {
                        return sendRedirect(response, "/dashboard");
                    }
                    const uiFile = path.resolve(
                        moduleRoot,
                        manifest.entrypoints.ui,
                    );
                    await htmlResponse.serveHtmlPage(
                        response,
                        uiFile,
                        log,
                        {
                            path: url.pathname,
                            method: request.method ?? "GET",
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

        const pageExtensionMatch = url.pathname.match(
            /^\/api\/v1\/ui\/page-extensions\/([^/]+)$/,
        );
        if (pageExtensionMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "user");
            if (!claims) return true;
            const pageId = decodeURIComponent(pageExtensionMatch[1]);
            const extensions = (
                uiRegistry?.listPageExtensions(pageId) ?? []
            ).filter(
                (extension) =>
                    (!extension.isEnabled || extension.isEnabled()) &&
                    isRoleAllowed(claims.role, extension.access),
            );
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: extensions }));
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/auth-typing-messages" &&
            request.method === "GET"
        ) {
            const viewerSession = ctx.getCookieSession(request);
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: [...gatewayMessages, ...moduleMessages],
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/settings-sections" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "user");
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: versionDescriptor(
                        uiRegistry?.resolveDescriptor(sections) ?? sections,
                        ASSET_VERSION,
                    ),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/navbar-plugins" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "user");
            if (!claims) return true;
            let plugins = (uiRegistry?.listNavbarPlugins() ?? []).filter(
                (plugin) =>
                    (!plugin.isEnabled || plugin.isEnabled()) &&
                    isRoleAllowed(claims.role, plugin.access),
            );
            const management = ctx
                .getCapability<import("@cognis/core").Ctx>("system:ctx")
                ?.getCapability<{
                    describeProviders: (
                        entries: typeof plugins,
                        catalog: string,
                    ) => Promise<typeof plugins>;
                }>("component:providerCatalog");
            if (management)
                plugins = await management.describeProviders(plugins, "navbar");
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: versionDescriptor(plugins, ASSET_VERSION),
                }),
            );
            return true;
        }

        if (
            await serveProviders(
                request,
                response,
                url,
                ctx,
                uiRegistry,
                ASSET_VERSION,
            )
        )
            return true;

        if (
            url.pathname === "/api/v1/ui/offline-routes" &&
            request.method === "GET"
        ) {
            const routes = (uiRegistry?.listSpaRoutes() ?? []).filter(
                (route) =>
                    route.public === true &&
                    route.offline &&
                    (!route.isEnabled || route.isEnabled()),
            );
            response.writeHead(200, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            response.end(
                JSON.stringify({
                    data: versionDescriptor(routes, ASSET_VERSION),
                    offlineGuards: (uiRegistry?.listCapabilityProviders() ?? [])
                        .map((provider) => provider.offlineAccessGuard)
                        .filter(Boolean),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/app-routes" &&
            request.method === "GET"
        ) {
            const claims = ctx.getAuthClaims(request);
            const routes = (uiRegistry?.listSpaRoutes() ?? []).filter(
                (route) =>
                    (!route.isEnabled || route.isEnabled()) &&
                    (claims
                        ? isRoleAllowed(claims.role, route.access)
                        : route.public === true),
            );
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: versionDescriptor(routes, ASSET_VERSION),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/ui/auth-footer-plugins" &&
            request.method === "GET"
        ) {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: versionDescriptor(
                        uiRegistry?.listAuthFooterPlugins() ?? [],
                        ASSET_VERSION,
                    ).map(({ scriptUrl }) => ({ scriptUrl })),
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
                const directory = uiRegistry?.getAdapterStaticDir(
                    gatewayId,
                    adapterId,
                );
                if (
                    directory &&
                    /^[a-zA-Z0-9_./-]+$/.test(filePart) &&
                    !filePart.includes("..")
                ) {
                    await serveVersionedAsset(
                        request,
                        response,
                        url,
                        path.join(directory, filePart),
                        resolveContentType(filePart),
                        ctx,
                    );
                    return true;
                }
            }
            response.writeHead(404, { "content-type": "application/json" });
            response.end(
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
            const slashIndex = rest.indexOf("/");
            if (slashIndex > 0) {
                const gatewayId = rest.slice(0, slashIndex);
                const filePart = rest.slice(slashIndex + 1);
                const directory = uiRegistry?.getStaticDir(gatewayId);
                if (
                    directory &&
                    /^[a-zA-Z0-9_./-]+$/.test(filePart) &&
                    !filePart.includes("..")
                ) {
                    await serveVersionedAsset(
                        request,
                        response,
                        url,
                        path.join(directory, filePart),
                        resolveContentType(filePart),
                        ctx,
                    );
                    return true;
                }
            }
            response.writeHead(404, { "content-type": "application/json" });
            response.end(
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
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Module asset not found.",
                        },
                    }),
                );
                return true;
            }
            if (
                !(await validateModuleAssetRevision(
                    response,
                    url,
                    urlPath.split("/")[0],
                    runtime,
                ))
            )
                return true;
            const resolved = uiRegistry?.resolveModulePath(urlPath);
            if (resolved) {
                await serveVersionedAsset(
                    request,
                    response,
                    url,
                    path.join(resolved.dir, resolved.relPath),
                    resolveContentType(resolved.relPath),
                    ctx,
                );
                return true;
            }
            if (
                await serveEnabledModuleAsset(
                    request,
                    response,
                    url,
                    urlPath,
                    runtime,
                    isModuleEnabled,
                    ctx,
                )
            )
                return true;
            if (
                await serveDeclaredModuleStrings(
                    request,
                    response,
                    url,
                    urlPath,
                    runtime,
                    ctx,
                )
            )
                return true;
            response.writeHead(404, { "content-type": "application/json" });
            response.end(
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
                    request,
                    response,
                    path.join(PRODUCTION_UI_ROOT, relativeAssetPath),
                    resolveContentType(relativeAssetPath),
                    log,
                    { path: url.pathname, method: request.method },
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
            if (!url.pathname.startsWith("/api/") && request.method === "GET") {
                const requestedCode = Number(
                    url.searchParams.get("code") ?? "",
                );
                const errorCode =
                    Number.isInteger(requestedCode) &&
                    requestedCode >= 400 &&
                    requestedCode <= 599
                        ? String(requestedCode)
                        : "404";
                response.writeHead(302, {
                    location: `/error?code=${errorCode}`,
                });
                response.end();
                return true;
            }
            return false;
        }

        if (!/^[a-zA-Z0-9_./-]+$/.test(relative) || relative.includes("..")) {
            response.writeHead(400, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    error: { code: "bad_request", message: "Invalid path." },
                }),
            );
            return true;
        }

        const filePath = staticPath(relative, STATIC_ROOT, SERVED_PUBLIC_ROOT);

        await serveVersionedAsset(
            request,
            response,
            url,
            filePath,
            resolveContentType(filePath),
            ctx,
        );
        return true;
    };
}
