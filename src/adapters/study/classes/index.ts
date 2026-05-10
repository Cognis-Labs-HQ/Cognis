import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { DbClassesStore } from "./store.js";
import { createClassesRoutes } from "./routes.js";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../api/auth/guard.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

let adapterReady = false;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "classes",
        adapterName: "Classes",
        isConfigured: () => adapterReady,
    };
}

/**
 * Page-serving route for `/classes`. Serves the classes SPA page.
 */
function createClassesPageRoute(isAdapterEnabled: () => boolean) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/classes") return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(
                path.join(PUBLIC_ROOT, "pages", "classes.html"),
                "utf8",
            ),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    if (!ctx.dbExecutor || !ctx.dbType) {
        ctx.log?.(
            "warn",
            "Study/classes adapter: no DB executor available — skipping.",
            { component: "study-classes" },
        );
        return;
    }

    const store = new DbClassesStore(ctx.dbExecutor, ctx.dbType);

    try {
        await store.ensureSchema();
    } catch (err) {
        ctx.log?.(
            "error",
            "Study/classes adapter: schema initialisation failed.",
            {
                component: "study-classes",
                error: err instanceof Error ? err.message : String(err),
            },
        );
        return;
    }

    adapterReady = true;

    const isEnabled = () => ctx.isAdapterEnabled();

    ctx.registerRoute(createClassesPageRoute(isEnabled), "study");
    ctx.registerRoute(createClassesRoutes(store), "study");

    const adapterRoot = path.dirname(fileURLToPath(import.meta.url));
    const uiDir = path.join(adapterRoot, "ui");
    ctx.registerStaticDir("adapters/study/classes", uiDir);

    ctx.log?.("info", "Study/classes adapter: bootstrapped.", {
        component: "study-classes",
    });
}
