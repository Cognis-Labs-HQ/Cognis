import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    FileReaderAdapter,
    FileReaderAdapterBootstrapCtx,
} from "../../../gateways/file-reader/gateway.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);
const IMAGE_VIEWER_SCRIPT_URL =
    "/static/adapters/file-reader/image/image-viewer.js";
const IMAGE_VIEWER_STYLESHEET_URL =
    "/static/adapters/file-reader/image/image-viewer.css";

export function createFileReaderAdapter(): FileReaderAdapter {
    return {
        adapterId: "image",
        adapterName: "Image Viewer",
        getSupportedTypes: () => [
            { ext: "jpg", mimeType: "image/jpeg" },
            { ext: "jpeg", mimeType: "image/jpeg" },
            { ext: "png", mimeType: "image/png" },
            { ext: "gif", mimeType: "image/gif" },
            { ext: "webp", mimeType: "image/webp" },
            { ext: "svg", mimeType: "image/svg+xml" },
            { ext: "avif", mimeType: "image/avif" },
        ],
    };
}

export async function bootstrapFileReaderAdapter(
    ctx: FileReaderAdapterBootstrapCtx,
): Promise<void> {
    ctx.capabilities.contribute("file-reader:image:ui", {
        scriptUrl: IMAGE_VIEWER_SCRIPT_URL,
        stylesheetUrl: IMAGE_VIEWER_STYLESHEET_URL,
    });
    ctx.registerAdapterStaticDir?.("file-reader", "image", ADAPTER_UI_ROOT);
    ctx.log?.("info", "File-reader/image adapter: bootstrapped.", {
        component: "file-reader-image",
    });
}
