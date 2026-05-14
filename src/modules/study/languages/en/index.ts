import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    LanguageModule,
    LanguageChildComponent,
    LanguageModuleBootstrapCtx,
} from "../../../../gateways/study/gateway.js";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../../gateways/auth/guard.js";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const ALPHABET_PAGE_URL = "/study/alphabet";
const ALPHABET_COMPONENT_STATIC_BASE =
    "/static/modules/study/languages/en/components/alphabet/ui";

const CHILD_COMPONENTS: LanguageChildComponent[] = [
    {
        id: "alphabet",
        label: "Alphabet",
        pageUrl: ALPHABET_PAGE_URL,
        scriptUrl: `${ALPHABET_COMPONENT_STATIC_BASE}/app.js`,
        stylesheets: [`${ALPHABET_COMPONENT_STATIC_BASE}/alphabet.css`],
        order: 0,
    },
];

class EnglishLanguageModule implements LanguageModule {
    readonly languageCode = "en";
    readonly languageName = "English";
    readonly languageFlag = "🇬🇧";
    readonly version = "1.0.3";

    listChildComponents(): LanguageChildComponent[] {
        return CHILD_COMPONENTS;
    }
}

function createAlphabetPageRoute() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (url.pathname !== ALPHABET_PAGE_URL) return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const htmlPath = path.join(
            MODULE_ROOT,
            "components",
            "alphabet",
            "ui",
            "index.html",
        );
        const html = await readFile(htmlPath, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

export function createLanguageModule(): LanguageModule {
    return new EnglishLanguageModule();
}

export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void> {
    ctx.registerChildRoute(createAlphabetPageRoute());
    ctx.registerStaticDir(
        "modules/study/languages/reuse",
        path.join(MODULE_ROOT, "..", "reuse"),
    );
    ctx.registerStaticDir(
        "modules/study/languages/en/components/alphabet/ui",
        path.join(MODULE_ROOT, "components", "alphabet", "ui"),
    );

    ctx.log?.("info", "English language module: bootstrapped.", {
        component: "study/languages/en",
        childComponents: CHILD_COMPONENTS.length,
    });
}
