import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    LanguageModule,
    LanguageChildComponent,
    LanguageModuleBootstrapCtx,
} from "../../../../gateways/study/gateway.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../../api/auth/guard.js";
import { readFile } from "node:fs/promises";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const CHILD_COMPONENTS: LanguageChildComponent[] = [
    {
        id: "hiragana-alphabet",
        label: "Hiragana Alphabet",
        pageUrl: "/study/ja/hiragana",
        order: 0,
    },
];

class JapaneseLanguageModule implements LanguageModule {
    readonly languageCode = "ja";
    readonly languageName = "日本語";
    readonly languageFlag = "🇯🇵";
    readonly version = "1.0.0";

    listChildComponents(): LanguageChildComponent[] {
        return CHILD_COMPONENTS;
    }
}

export function createLanguageModule(): LanguageModule {
    return new JapaneseLanguageModule();
}

function createHiraganaPageRoute(): (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean> {
    return async (req, res, url) => {
        if (req.method && req.method !== "GET") return false;
        if (url.pathname !== "/study/ja/hiragana") return false;
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

export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void> {
    ctx.registerChildRoute(createHiraganaPageRoute());

    ctx.registerStaticDir(
        "modules/study/languages/ja/components/hiragana-alphabet",
        path.join(MODULE_ROOT, "components", "hiragana-alphabet", "ui"),
    );

    ctx.log?.("info", "Japanese language module: bootstrapped.", {
        component: "study-language-ja",
        childComponents: CHILD_COMPONENTS.length,
    });
}
