/**
 * Versions UI descriptors and serves revisioned assets with matching cache policy.
 * Public exports: versionDescriptor recursively versions static URLs; createVersionedAssetServer binds the selected revision; IMMUTABLE_CACHE_CONTROL and REVALIDATED_CACHE_CONTROL expose the matching policy values.
 * @example const serveAsset = createVersionedAssetServer(assetVersion); await serveAsset(request, response, url, filePath, contentType, routeContext);
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../reuse/route-context.js";
import { serveStaticAsset } from "../../reuse/static-asset-response.js";

/**
 * Adds the selected revision to static URLs throughout a descriptor.
 * @param descriptor Descriptor whose nested asset URLs should be versioned.
 * @param assetVersion Selected UI asset revision.
 * @returns The descriptor with versioned asset URLs.
 */
export function versionDescriptor<T>(descriptor: T, assetVersion: string): T {
    if (typeof descriptor === "string")
        return versionAssetUrl(descriptor, assetVersion) as T;
    if (Array.isArray(descriptor)) {
        return descriptor.map((value) =>
            versionDescriptor(value, assetVersion),
        ) as T;
    }
    if (!descriptor || typeof descriptor !== "object") return descriptor;
    return Object.fromEntries(
        Object.entries(descriptor).map(([key, value]) => [
            key,
            typeof value === "string"
                ? versionAssetUrl(value, assetVersion)
                : versionDescriptor(value, assetVersion),
        ]),
    ) as T;
}

function versionAssetUrl(assetUrl: string, assetVersion: string): string {
    if (assetUrl.startsWith("/assets/")) return assetUrl;
    if (!assetUrl.startsWith("/static/") && !assetUrl.startsWith("/assets/")) {
        return assetUrl;
    }
    const pathname = new URL(assetUrl, "http://localhost").pathname;
    if (!/\.(?:css|html|jpe?g|js|json|mjs|png|svg|webp|xml)$/.test(pathname)) {
        return assetUrl;
    }
    const separator = assetUrl.includes("?") ? "&" : "?";
    return `${assetUrl}${separator}v=${encodeURIComponent(assetVersion)}`;
}

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const REVALIDATED_CACHE_CONTROL = "public, max-age=0, must-revalidate";

/**
 * Binds immutable caching to a selected UI revision while keeping module assets revalidated.
 * @param {string} assetVersion Revision selected by server configuration.
 * @returns {(request:IncomingMessage,response:ServerResponse,url:URL,filePath:string,contentType:string,routeContext?:RouteContext)=>Promise<void>} The configured asset responder.
 */
export function createVersionedAssetServer(
    assetVersion: string,
): (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
    filePath: string,
    contentType: string,
    routeContext?: RouteContext,
) => Promise<void> {
    return async function serveVersionedAsset(
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
        filePath: string,
        contentType: string,
        routeContext?: RouteContext,
    ): Promise<void> {
        routeContext?.setPageSecurityHeaders(response);
        const isVersioned =
            !url.pathname.startsWith("/static/modules/") &&
            url.searchParams.get("v") === assetVersion;
        await serveStaticAsset(
            request,
            response,
            filePath,
            contentType,
            undefined,
            undefined,
            isVersioned ? IMMUTABLE_CACHE_CONTROL : REVALIDATED_CACHE_CONTROL,
        );
    };
}
