import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FileOpenRequest } from "@cognis/core";
import { readGatewayManifestVersion } from "../reuse/manifest-version.js";
import type { GatewayBootstrapContext } from "../shared.js";

type Renderer = {
    id: string;
    extensions: string[];
    open(request: FileOpenRequest): Promise<unknown>;
};

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const renderers = new Map<string, Renderer>();
    const open = async (request: FileOpenRequest) => {
        const extension = path.extname(request.key).slice(1).toLowerCase();
        const renderer = request.rendererId
            ? renderers.get(request.rendererId)
            : [...renderers.values()].find((candidate) =>
                  candidate.extensions.includes(extension),
              );
        if (!renderer)
            return { accepted: false, reason: "renderer_unavailable" };
        return {
            accepted: true,
            rendererId: renderer.id,
            result: await renderer.open(request),
        };
    };
    ctx.capabilities.contribute("file-render:register", (renderer: Renderer) =>
        renderers.set(renderer.id, renderer),
    );
    ctx.capabilities.contribute("file-render:list", () =>
        [...renderers.values()].map(({ id, extensions }) => ({
            id,
            extensions,
        })),
    );
    ctx.capabilities.contribute("file-render:open", open);
    ctx.uiRegistry?.registerStaticDir(
        "file-render",
        path.join(path.dirname(fileURLToPath(import.meta.url)), "ui"),
    );
    ctx.uiRegistry?.registerCapabilityProvider({
        scriptUrl: "/static/gateways/file-render/provider.js",
        providesCapabilities: ["file-render:open"],
    });
    ctx.gatewayRegistry.register({
        id: "file-render",
        name: "File Render Gateway",
        version: await readGatewayManifestVersion(
            import.meta.url,
            "./manifest.json",
        ),
        description: "Selects renderer adapters for file-open requests.",
        publisher: "Cognis Labs HQ",
    });
}
