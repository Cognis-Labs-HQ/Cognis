import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    LanguageModule,
    LanguageChildComponent,
    LanguageModuleBootstrapCtx,
} from "../../../../gateways/study/gateway.js";
import {
    getCookieSession,
    requireAuth,
    setPageSecurityHeaders,
} from "../../../../gateways/auth/guard.js";
import { readJson } from "../../../../api/reuse/read-json.js";
import { readFile } from "node:fs/promises";
import {
    LanguageLibraryStore,
    type LibraryLayerName,
} from "../reuse/library-store.js";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const HIRAGANA_PAGE_URL = "/study/hiragana";
const LIBRARY_PAGE_URL = "/study/library";
const CLASSROOM_PAGE_URL = "/study/ja-classroom";
const HIRAGANA_COMPONENT_STATIC_BASE =
    "/static/modules/study/languages/ja/components/hiragana-alphabet/ui";
const LIBRARY_COMPONENT_STATIC_BASE =
    "/static/modules/study/languages/ja/components/library/ui";
const CLASSROOM_COMPONENT_STATIC_BASE =
    "/static/modules/study/languages/ja/components/classroom/ui";

const CHILD_COMPONENTS: LanguageChildComponent[] = [
    {
        id: "hiragana-alphabet",
        label: "Hiragana Alphabet",
        pageUrl: HIRAGANA_PAGE_URL,
        scriptUrl: `${HIRAGANA_COMPONENT_STATIC_BASE}/app.js`,
        stylesheets: [`${HIRAGANA_COMPONENT_STATIC_BASE}/hiragana.css`],
        order: 0,
    },
    {
        id: "library",
        label: "Library",
        pageUrl: LIBRARY_PAGE_URL,
        scriptUrl: `${LIBRARY_COMPONENT_STATIC_BASE}/app.js`,
        stylesheets: [`${LIBRARY_COMPONENT_STATIC_BASE}/library.css`],
        minRole: "admin",
        order: 100,
    },
    {
        id: "classroom",
        label: "Classroom",
        pageUrl: CLASSROOM_PAGE_URL,
        scriptUrl: `${CLASSROOM_COMPONENT_STATIC_BASE}/app.js`,
        stylesheets: [
            "/static/modules/study/languages/reuse/classroom-page.css",
        ],
        order: 999,
    },
];

let libraryStore: LanguageLibraryStore | null = null;

class JapaneseLanguageModule implements LanguageModule {
    readonly languageCode = "ja";
    readonly languageName = "日本語";
    readonly languageFlag = "🇯🇵";
    readonly version = "1.2.1";

    listChildComponents(): LanguageChildComponent[] {
        return CHILD_COMPONENTS;
    }
}

const LIBRARY_LAYERS: LibraryLayerName[] = [
    "characters",
    "alt_characters",
    "definitions",
    "words",
    "sentences",
];

function isLibraryLayerName(layerName: string): layerName is LibraryLayerName {
    return LIBRARY_LAYERS.includes(layerName as LibraryLayerName);
}

function jsonOk(res: ServerResponse, data: unknown): void {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data }));
}

function jsonError(
    res: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message } }));
}

function createHiraganaPageRoute() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (url.pathname !== HIRAGANA_PAGE_URL) return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const htmlPath = path.join(
            MODULE_ROOT,
            "components",
            "hiragana-alphabet",
            "ui",
            "index.html",
        );
        const html = await readFile(htmlPath, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

function createLibraryPageRoute() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (url.pathname !== LIBRARY_PAGE_URL) return false;
        const session = getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (session.role !== "admin" && session.role !== "owner") {
            res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
            res.end("Requires admin scope");
            return true;
        }
        setPageSecurityHeaders(res);
        const htmlPath = path.join(
            MODULE_ROOT,
            "components",
            "library",
            "ui",
            "index.html",
        );
        const html = await readFile(htmlPath, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

function createClassroomPageRoute() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (url.pathname !== CLASSROOM_PAGE_URL) return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const htmlPath = path.join(
            MODULE_ROOT,
            "components",
            "classroom",
            "ui",
            "index.html",
        );
        const html = await readFile(htmlPath, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

function createLibraryApiRoute() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/study/languages/ja/library")) {
            return false;
        }

        const claims = requireAuth(req, res, "user");
        if (!claims) return true;

        if (!libraryStore) {
            jsonError(
                res,
                503,
                "library_unavailable",
                "Language library is not ready.",
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/study/languages/ja/library/snapshot" &&
            req.method === "GET"
        ) {
            jsonOk(res, libraryStore.snapshot());
            return true;
        }

        const layerMatch = url.pathname.match(
            /^\/api\/v1\/study\/languages\/ja\/library\/([^/]+)(?:\/([^/]+))?$/,
        );
        if (!layerMatch) return false;

        const layerName = decodeURIComponent(layerMatch[1]);
        const recordId = layerMatch[2]
            ? decodeURIComponent(layerMatch[2])
            : null;

        if (!isLibraryLayerName(layerName)) {
            jsonError(res, 404, "layer_not_found", "Unknown library layer.");
            return true;
        }

        if (req.method === "GET") {
            const query = Object.fromEntries(url.searchParams.entries());
            const records = libraryStore.queryLayer(layerName, query);
            jsonOk(res, records);
            return true;
        }

        if (claims.role !== "admin" && claims.role !== "owner") {
            jsonError(res, 403, "forbidden", "Requires admin scope");
            return true;
        }

        if (req.method === "POST") {
            const payload = (await readJson(req)) as { record?: unknown };
            const record = payload?.record;
            if (!record || typeof record !== "object") {
                jsonError(
                    res,
                    400,
                    "invalid_body",
                    "record object is required.",
                );
                return true;
            }
            try {
                const createdRecord = await libraryStore.addRecord(
                    layerName,
                    record,
                );
                jsonOk(res, createdRecord);
            } catch (error) {
                jsonError(
                    res,
                    400,
                    "library_write_failed",
                    error instanceof Error ? error.message : String(error),
                );
            }
            return true;
        }

        if (req.method === "PUT") {
            if (!recordId) {
                jsonError(
                    res,
                    400,
                    "missing_id",
                    "Record id is required for updates.",
                );
                return true;
            }
            const payload = (await readJson(req)) as { patch?: unknown };
            const patch = payload?.patch;
            if (!patch || typeof patch !== "object") {
                jsonError(
                    res,
                    400,
                    "invalid_body",
                    "patch object is required.",
                );
                return true;
            }
            try {
                const updatedRecord = await libraryStore.updateRecord(
                    layerName,
                    recordId,
                    patch,
                );
                jsonOk(res, updatedRecord);
            } catch (error) {
                jsonError(
                    res,
                    400,
                    "library_write_failed",
                    error instanceof Error ? error.message : String(error),
                );
            }
            return true;
        }

        if (req.method === "DELETE") {
            if (!recordId) {
                jsonError(
                    res,
                    400,
                    "missing_id",
                    "Record id is required for deletion.",
                );
                return true;
            }
            try {
                await libraryStore.removeRecord(layerName, recordId);
                jsonOk(res, { deleted: true, id: recordId, layer: layerName });
            } catch (error) {
                jsonError(
                    res,
                    400,
                    "library_write_failed",
                    error instanceof Error ? error.message : String(error),
                );
            }
            return true;
        }

        return false;
    };
}

export function createLanguageModule(): LanguageModule {
    return new JapaneseLanguageModule();
}

export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void> {
    libraryStore = new LanguageLibraryStore({
        moduleRoot: MODULE_ROOT,
        languageCode: "ja",
        altCharactersFileName: "kanji",
        log: ctx.log,
    });
    await libraryStore.initialise();

    ctx.registerChildRoute(createHiraganaPageRoute());
    ctx.registerChildRoute(createClassroomPageRoute());
    ctx.registerChildRoute(createLibraryPageRoute());
    ctx.registerChildRoute(createLibraryApiRoute());

    ctx.registerStaticDir(
        "modules/study/languages/reuse",
        path.join(MODULE_ROOT, "..", "reuse"),
    );
    ctx.registerStaticDir(
        "modules/study/languages/ja/components/hiragana-alphabet/ui",
        path.join(MODULE_ROOT, "components", "hiragana-alphabet", "ui"),
    );
    ctx.registerStaticDir(
        "modules/study/languages/ja/components/library/ui",
        path.join(MODULE_ROOT, "components", "library", "ui"),
    );
    ctx.registerStaticDir(
        "modules/study/languages/ja/components/classroom/ui",
        path.join(MODULE_ROOT, "components", "classroom", "ui"),
    );

    ctx.log?.("info", "Japanese language module: bootstrapped.", {
        component: "study/languages/ja",
        childComponents: CHILD_COMPONENTS.length,
    });
}
