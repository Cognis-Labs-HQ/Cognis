import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import test from "node:test";
import type { ModuleMarketplaceService, ModuleService } from "@cognis/core";
import { createModuleRoutes } from "../../routes/modules/index.js";
import type { RouteContext } from "../../reuse/route-context.js";

const moduleUuid = "2b71bcdf-e29c-408b-8d12-ead6e377c82e";
const english =
    '<resources><string name="module.example.name">Example</string></resources>';
const japanese =
    '<resources><string name="module.example.name">例</string></resources>';

function catalogRoute(
    strings: Record<string, string>,
    assets: Record<string, string>,
) {
    const marketplace = {
        listCachedModules: async () => [
            { uuid: moduleUuid, assetIds: { strings } },
        ],
        getAsset: async (id: string) =>
            assets[id] === undefined
                ? undefined
                : {
                      body: Buffer.from(assets[id]),
                      contentType: "application/xml",
                  },
    } as unknown as ModuleMarketplaceService;
    const context = {
        requireAuth(req, res, minRole) {
            assert.equal(minRole, "admin");
            if (req.headers.authorization !== "Bearer administrator") {
                res.writeHead(403);
                res.end(JSON.stringify({ error: { code: "forbidden" } }));
                return null;
            }
            return { sub: "administrator", role: "admin" };
        },
    } as RouteContext;
    return createModuleRoutes(
        {} as ModuleService,
        undefined,
        context,
        marketplace,
    );
}

async function requestStrings(
    route: ReturnType<typeof createModuleRoutes>,
    locale: string,
    options: { uuid?: string; authorization?: string } = {},
) {
    let status = 0;
    let headers: Record<string, string> = {};
    let body = "";
    const handled = await route(
        {
            method: "GET",
            headers: {
                authorization: options.authorization ?? "Bearer administrator",
            },
        } as IncomingMessage,
        {
            writeHead(code: number, values: Record<string, string> = {}) {
                status = code;
                headers = values;
            },
            end(value: Buffer | string) {
                body = value.toString();
            },
        } as ServerResponse,
        new URL(
            `http://localhost/api/v1/modules/catalog/strings/${options.uuid ?? moduleUuid}/${locale}/strings.xml`,
        ),
    );
    assert.equal(handled, true);
    return { status, headers, body };
}

for (const [description, strings, assets] of [
    ["unavailable locale", { en: "english" }, { english }],
    [
        "missing cached locale asset",
        { en: "english", ja: "missing" },
        { english },
    ],
] as const) {
    test(`catalog strings use English fallback for ${description}`, async () => {
        const result = await requestStrings(
            catalogRoute(strings, assets),
            "ja",
        );
        assert.equal(result.status, 200);
        assert.equal(result.body, english);
        assert.equal(result.headers["content-type"], "application/xml");
        assert.equal(result.headers["content-language"], "en");
        assert.match(result.headers["cache-control"], /^private,/);
    });
}

test("catalog strings preserve the requested translation when cached", async () => {
    const route = catalogRoute(
        { en: "english", ja: "japanese" },
        { english, japanese },
    );
    for (const [locale, body] of [
        ["en", english],
        ["ja", japanese],
    ]) {
        const result = await requestStrings(route, locale);
        assert.equal(result.status, 200);
        assert.equal(result.body, body);
        assert.equal(result.headers["content-language"], locale);
    }
});

test("catalog strings retain not-found errors when no usable bundle exists", async () => {
    const route = catalogRoute({ en: "missing" }, {});
    for (const options of [{}, { uuid: "unknown-module" }]) {
        const result = await requestStrings(route, "ja", options);
        assert.equal(result.status, 404);
        assert.equal(
            JSON.parse(result.body).error.code,
            "module_strings_not_found",
        );
    }
});

test("catalog fallback requires administrator authorization before reading assets", async () => {
    const result = await requestStrings(
        catalogRoute({ en: "english" }, { english }),
        "ja",
        {
            authorization: "Bearer regular-user",
        },
    );
    assert.equal(result.status, 403);
    assert.equal(JSON.parse(result.body).error.code, "forbidden");
});
