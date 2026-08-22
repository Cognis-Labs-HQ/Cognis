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
const ASSET_VERSION = process.env.COGNIS_ASSET_VERSION ?? "development";

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
        url.searchParams.get("v") === ASSET_VERSION
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
    );
    return true;
}
