import type { IncomingMessage, ServerResponse } from "node:http";
import { stat } from "node:fs/promises";
import path from "node:path";
export { uiStaticPath } from "./static-path.js";
import type { ModuleManifest, ModuleRuntimeGateway } from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";
import {
    resolveContentType,
    serveStaticAsset,
} from "../../reuse/static-asset-response.js";

const EXTERNAL_MODULES_ROOT =
    process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
    path.resolve(process.cwd(), "external-modules");

export async function resolveModuleRoot(
    manifest: Pick<ModuleManifest, "id" | "uuid">,
): Promise<string> {
    if (!manifest.uuid) throw new Error(`module_uuid_required:${manifest.id}`);
    const moduleRoot = path.resolve(EXTERNAL_MODULES_ROOT, manifest.uuid);
    if (!(await stat(moduleRoot)).isDirectory()) {
        throw new Error(`module_root_missing:${manifest.id}`);
    }
    return moduleRoot;
}

export async function serveDeclaredModuleStrings(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    urlPath: string,
    runtime?: ModuleRuntimeGateway,
    routeContext?: RouteContext,
): Promise<boolean> {
    const [moduleId, ...assetSegments] = urlPath.split("/");
    const manifest = (await runtime?.listManifests())?.find(
        (entry) => entry.id === moduleId,
    );
    const stringsPrefix = (
        manifest?.ui?.stringsBaseUrl ??
        (manifest ? `/static/modules/${manifest.id}/languages` : undefined)
    )?.replace(/^\/static\/modules\//, "");
    if (
        !manifest ||
        !stringsPrefix ||
        (urlPath !== stringsPrefix && !urlPath.startsWith(`${stringsPrefix}/`))
    ) {
        return false;
    }
    const moduleRoot = await resolveModuleRoot(manifest);
    const uiRoot = path.resolve(
        moduleRoot,
        path.dirname(manifest.entrypoints.ui ?? "ui/index.js"),
    );
    const assetPath = path.resolve(uiRoot, assetSegments.join("/"));
    if (!assetPath.startsWith(`${uiRoot}${path.sep}`)) return false;
    routeContext?.setPageSecurityHeaders(res);
    await serveStaticAsset(
        req,
        res,
        assetPath,
        resolveContentType(assetPath),
        undefined,
        undefined,
        "public, max-age=0, must-revalidate",
    );
    return true;
}

export async function serveEnabledModuleAsset(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    urlPath: string,
    runtime?: ModuleRuntimeGateway,
    isModuleEnabled?: (moduleId: string) => boolean,
    routeContext?: RouteContext,
): Promise<boolean> {
    const [moduleId, ...assetSegments] = urlPath.split("/");
    if (!moduleId || !assetSegments.length || !isModuleEnabled?.(moduleId)) {
        return false;
    }
    const manifest = (await runtime?.listManifests())?.find(
        (entry) => entry.id === moduleId,
    );
    if (!manifest) return false;
    const moduleRoot = await resolveModuleRoot(manifest);
    const uiRoot = path.resolve(
        moduleRoot,
        path.dirname(manifest.entrypoints.ui ?? "ui/index.js"),
    );
    const assetPath = path.resolve(uiRoot, assetSegments.join("/"));
    if (!assetPath.startsWith(`${uiRoot}${path.sep}`)) return false;
    routeContext?.setPageSecurityHeaders(res);
    await serveStaticAsset(
        req,
        res,
        assetPath,
        resolveContentType(assetPath),
        undefined,
        undefined,
        "public, max-age=0, must-revalidate",
    );
    return true;
}

export async function validateModuleAssetRevision(
    res: ServerResponse,
    url: URL,
    moduleId: string,
    runtime?: ModuleRuntimeGateway,
): Promise<boolean> {
    const requestedRevision = url.searchParams.get("revision");
    if (!requestedRevision) return true;
    const manifest = (await runtime?.listManifests())?.find(
        (entry) => entry.id === moduleId,
    );
    if (!manifest) return true;
    if (requestedRevision !== manifest.version) {
        res.writeHead(409, {
            "content-type": "application/json",
            "cache-control": "no-store",
        });
        res.end(JSON.stringify({ error: { code: "module_revision_changed" } }));
        return false;
    }
    res.setHeader("x-cognis-module-revision", manifest.version);
    return true;
}
