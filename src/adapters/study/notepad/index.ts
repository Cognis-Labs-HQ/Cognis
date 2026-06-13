import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { handleClassroomNotepadRoutes } from "./routes/index.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);
const NOTEPAD_SCRIPT_URL =
    "/static/adapters/study/notepad/classroom-notepad.js";
const NOTEPAD_STRINGS_BASE_URL = "/static/adapters/study/notepad/languages";
const NOTEPAD_STYLESHEET_URL =
    "/static/adapters/study/notepad/classes-notepad.css";
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

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "notepad",
        adapterName: "Notepad",
        getConfig: () => ({
            maxFileBytes,
        }),
        setConfig: (config) => {
            maxFileBytes = normalizeMaxFileBytes(config?.maxFileBytes);
        },
        isConfigured: () => true,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const getMaxFileBytes = () => maxFileBytes;

    ctx.capabilities.contribute("study:notepad:ui", {
        scriptUrl: NOTEPAD_SCRIPT_URL,
        stringsBaseUrl: NOTEPAD_STRINGS_BASE_URL,
        stylesheetUrl: NOTEPAD_STYLESHEET_URL,
    });
    ctx.capabilities.contribute("study:notepad:maxFileBytes", getMaxFileBytes);
    ctx.registerAdapterStaticDir?.("study", "notepad", ADAPTER_UI_ROOT);
    ctx.registerRoute(async (req, res, url) => {
        return handleClassroomNotepadRoutes({
            req,
            res,
            url,
            ctx: routeHelpers,
            getMaxFileBytes,
        });
    }, "study");

    ctx.log?.("info", "Study/notepad adapter: bootstrapped.", {
        component: "study-notepad",
    });
}
