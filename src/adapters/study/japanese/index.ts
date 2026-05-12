import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../api/auth/guard.js";
import { readFile } from "node:fs/promises";

const ADAPTER_ROOT = path.dirname(fileURLToPath(import.meta.url));

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "japanese",
        adapterName: "Japanese",
        isConfigured: () => true,
    };
}

function createJapanesePageRoute(isAdapterEnabled: () => boolean) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/study/ja") return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const htmlPath = path.join(ADAPTER_ROOT, "ui", "index.html");
        const html = await readFile(htmlPath, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const isEnabled = () => ctx.isAdapterEnabled();

    if (ctx.dbExecutor) {
        try {
            const { DbClassesStore } = await import("../classes/store.js");
            const store = new DbClassesStore(ctx.dbExecutor);
            await store.upsertStudyLanguage({
                code: "ja",
                name: "Japanese",
                flag: "🇯🇵",
                available: true,
                active: false,
                sortOrder: 1,
            });
        } catch (err) {
            ctx.log?.(
                "warn",
                "Japanese adapter: could not ensure study language entry.",
                {
                    component: "study-japanese",
                    error: err instanceof Error ? err.message : String(err),
                },
            );
        }
    }

    ctx.registerRoute(createJapanesePageRoute(isEnabled), "study");

    ctx.registerStaticDir(
        "adapters/study/japanese",
        path.join(ADAPTER_ROOT, "ui"),
    );

    ctx.log?.("info", "Japanese study adapter: bootstrapped.", {
        component: "study-japanese",
    });
}
