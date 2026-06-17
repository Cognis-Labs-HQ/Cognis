import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    FileReaderAdapter,
    FileReaderAdapterBootstrapCtx,
} from "../../../gateways/file-reader/gateway.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import { createTextAdapterConfigRoutes } from "./routes/config.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);
const TEXT_SCRIPT_URL =
    "/static/adapters/file-reader/text/classroom-notepad.js";
const TEXT_STRINGS_BASE_URL = "/static/adapters/file-reader/text/languages";
const TEXT_STYLESHEET_URL =
    "/static/adapters/file-reader/text/classes-notepad.css";
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const MIN_MAX_FILE_BYTES = 16 * 1024;
const MAX_MAX_FILE_BYTES = 4 * 1024 * 1024;

let maxFileBytes = DEFAULT_MAX_FILE_BYTES;

function normalizeMaxFileBytes(input: unknown): number {
    const numericValue = Number(input);
    if (!Number.isFinite(numericValue)) {
        return DEFAULT_MAX_FILE_BYTES;
    }
    const boundedValue = Math.floor(numericValue);
    if (boundedValue < MIN_MAX_FILE_BYTES) {
        return MIN_MAX_FILE_BYTES;
    }
    if (boundedValue > MAX_MAX_FILE_BYTES) {
        return MAX_MAX_FILE_BYTES;
    }
    return boundedValue;
}

export function createFileReaderAdapter(): FileReaderAdapter {
    return {
        adapterId: "text",
        adapterName: "Text / Markdown",
        getSupportedTypes: () => [
            { ext: "txt", mimeType: "text/plain" },
            { ext: "md", mimeType: "text/markdown" },
            { ext: "markdown", mimeType: "text/markdown" },
        ],
    };
}

export async function bootstrapFileReaderAdapter(
    ctx: FileReaderAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const dbExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    const getMaxFileBytes = () => maxFileBytes;

    ctx.capabilities.contribute("file-reader:text:ui", {
        scriptUrl: TEXT_SCRIPT_URL,
        stringsBaseUrl: TEXT_STRINGS_BASE_URL,
        stylesheetUrl: TEXT_STYLESHEET_URL,
    });
    ctx.capabilities.contribute(
        "file-reader:text:maxFileBytes",
        getMaxFileBytes,
    );
    ctx.registerAdapterStaticDir?.("file-reader", "text", ADAPTER_UI_ROOT);

    if (dbExecutor) {
        const configRoute = createTextAdapterConfigRoutes({
            ctx: routeHelpers,
            dbExecutor,
            defaultMaxFileBytes: DEFAULT_MAX_FILE_BYTES,
            minMaxFileBytes: MIN_MAX_FILE_BYTES,
            maxMaxFileBytes: MAX_MAX_FILE_BYTES,
            normalizeMaxFileBytes,
            onConfigChanged: (value) => {
                maxFileBytes = value;
            },
            log: ctx.log,
        });
        ctx.registerRoute(configRoute, "file-reader");
    }

    ctx.log?.("info", "File-reader/text adapter: bootstrapped.", {
        component: "file-reader-text",
        maxFileBytes,
    });
}
