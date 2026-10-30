import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { access, readdir } from "node:fs/promises";
import { build } from "esbuild";
import { createUiRoutes } from "../../routes/ui/index.js";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("Study providers and pages load their actual source-module graphs through public static routes", async () => {
    const registry = new UIRegistry();
    const gateways = path.resolve("src/gateways");
    for (const entry of await readdir(gateways, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const directory = path.join(gateways, entry.name, "ui");
        if (
            await access(directory).then(
                () => true,
                () => false,
            )
        ) {
            registry.registerStaticDir(entry.name, directory);
        }
    }
    const adapters = path.resolve("src/adapters");
    for (const gateway of await readdir(adapters, { withFileTypes: true })) {
        if (!gateway.isDirectory()) continue;
        for (const adapter of await readdir(path.join(adapters, gateway.name), {
            withFileTypes: true,
        })) {
            if (!adapter.isDirectory()) continue;
            const directory = path.join(
                adapters,
                gateway.name,
                adapter.name,
                "ui",
            );
            if (
                await access(directory).then(
                    () => true,
                    () => false,
                )
            ) {
                registry.registerAdapterStaticDir(
                    gateway.name,
                    adapter.name,
                    directory,
                );
            }
        }
    }
    const route = createUiRoutes(undefined, registry);
    const served = new Set<string>();
    await build({
        entryPoints: [
            "/static/adapters/study/library/provider.js",
            "/static/adapters/study/library/app/layer/index.js",
            "/static/adapters/study/library/app/index.js",
            "/static/adapters/study/library/app/requests/index.js",
            "/static/adapters/study/library/app/search/index.js",
            "/static/adapters/study/flashcards/app/index.js",
        ],
        bundle: true,
        write: false,
        outdir: "unused",
        format: "esm",
        platform: "browser",
        // Resolve conditional imports as a browser would, excluding Node-only paths.
        define: { window: "true" },
        minifySyntax: true,
        logLevel: "silent",
        plugins: [
            {
                name: "public-source-routes",
                setup(builder) {
                    builder.onResolve({ filter: /.*/ }, (args) => ({
                        path: new URL(
                            args.path,
                            args.importer || "http://localhost/",
                        ).href,
                        namespace: "served-module",
                    }));
                    builder.onLoad(
                        { filter: /.*/, namespace: "served-module" },
                        async (args) => {
                            const url = new URL(args.path);
                            const response = createResponseRecorder();
                            assert.equal(
                                await route(
                                    { headers: {} } as never,
                                    response.res as never,
                                    url,
                                ),
                                true,
                                url.pathname,
                            );
                            assert.equal(
                                response.status,
                                200,
                                `${url.pathname} must be served to the browser`,
                            );
                            const json = url.pathname.endsWith(".json");
                            assert.equal(
                                response.headers["content-type"],
                                json
                                    ? "application/json; charset=utf-8"
                                    : "text/javascript; charset=utf-8",
                                url.pathname,
                            );
                            served.add(url.pathname);
                            return {
                                contents: response.body,
                                loader: json ? "json" : "js",
                            };
                        },
                    );
                },
            },
        ],
    });
    assert.ok(served.has("/static/gateways/study/library-client.js"));
    assert.ok(served.has("/static/gateways/study/language.js"));
    assert.ok(
        served.has(
            "/static/adapters/study/library/reuse/definition-languages.json",
        ),
    );
});
