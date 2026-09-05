import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
    StudyClassAccessCapability,
} from "../../../gateways/study/gateway.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { createLibraryRoutes } from "./routes/index.js";
import { LibraryService } from "./service.js";
import { LibraryStore } from "./store.js";
import {
    STRING_LOCALIZATION_CAPABILITY,
    type StringLocalizationCapability,
} from "./types.js";

let adapterReady = false;
const UI_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "library",
        adapterName: "Library",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => adapterReady,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const db = ctx.capabilities.get<DbExecutor>("db:executor");
    if (!db) {
        await ctx.log?.(
            "error",
            "Study/library adapter requires the DB gateway.",
            { component: "study-library", operation: "bootstrap" },
        );
        return;
    }
    const store = new LibraryStore(db);
    try {
        await store.ensureSchema();
    } catch (error) {
        await ctx.log?.(
            "error",
            "Study/library schema initialization failed.",
            {
                component: "study-library",
                operation: "bootstrap",
                fatal: true,
                error: error instanceof Error ? error.message : String(error),
            },
        );
        return;
    }
    const service = new LibraryService(
        store,
        ctx.capabilities.get<StudyClassAccessCapability>(
            "study:classes:access",
        ),
        ctx.flow,
        ctx.log,
        ctx.capabilities.get<StringLocalizationCapability>(
            STRING_LOCALIZATION_CAPABILITY,
        ),
    );
    ctx.capabilities.contribute("study:library", service);
    ctx.registerRoute(
        createLibraryRoutes(
            service,
            ctx.capabilities.get<RouteContext>("auth:routeContext"),
            ctx.log,
        ),
        "study",
    );
    ctx.registerAdapterStaticDir?.("study", "library", UI_ROOT);
    ctx.registerSpaRoute?.({
        id: "study-library-page",
        pattern: "^/study/library(?:/[^/]+/[^/]+/[^/]+)?$",
        base: "/study/library",
        scriptUrl: "/static/adapters/study/library/app.js",
        stylesheets: ["/static/adapters/study/library/library.css"],
        requiredCapabilities: ["study:library:detailFlow"],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    adapterReady = true;
    await ctx.log?.("info", "Study/library adapter bootstrapped.", {
        component: "study-library",
        operation: "bootstrap",
    });
}
