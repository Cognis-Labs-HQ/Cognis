import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

for (const elapsed of [11_000, 120_001]) {
    test(`module activation at ${elapsed}ms respects the default bounded bootstrap budget`, async (t) => {
        const modulesRoot = await mkdtemp(
            path.join(tmpdir(), "cognis-bootstrap-budget-"),
        );
        const moduleUuid = "16359445-87eb-4ceb-82b1-98db4fb21301";
        const moduleRoot = path.join(modulesRoot, moduleUuid);
        await mkdir(moduleRoot);
        await writeFile(
            path.join(moduleRoot, "bootstrap.js"),
            `
            export async function bootstrapModule(ctx) {
                await ctx.getCapability("fixture:ingestion").run();
                ctx.registerApiGet("/api/v1/modules/content-pack/ready", (_req, res) => res.end("ready"));
            }
        `,
        );
        const previousRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
        t.after(async () => {
            t.mock.timers.reset();
            if (previousRoot === undefined)
                delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
            else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousRoot;
            await rm(modulesRoot, { recursive: true, force: true });
        });
        let enter!: () => void;
        let finish!: () => void;
        const entered = new Promise<void>((resolve) => {
            enter = resolve;
        });
        const ingestion = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const failures: string[] = [];
        const extensions = createModuleExtensionRoutes(
            {
                listManifests: async () => [
                    {
                        id: "content-pack",
                        uuid: moduleUuid,
                        entrypoints: { bootstrap: "./bootstrap.js" },
                    },
                ],
            } as never,
            () => true,
            undefined,
            {
                routeContext: createDefaultRouteContext({
                    getCapability: ((id: string) =>
                        id === "fixture:ingestion"
                            ? {
                                  run: () => {
                                      enter();
                                      return ingestion;
                                  },
                              }
                            : undefined) as never,
                }),
                onBootstrapFailed: (id) => {
                    failures.push(id);
                },
            },
        );
        t.mock.timers.enable({ apis: ["setTimeout"] });
        const refresh = extensions.refresh({ throwOnFailure: true });
        // Attach the rejection handler before advancing the virtual deadline.
        const settled = refresh.then(
            () => null,
            (error: Error) => error,
        );
        await entered;
        t.mock.timers.tick(elapsed);
        finish();
        const error = await settled;
        const response = { end: (text: string) => assert.equal(text, "ready") };
        const handled = await extensions.handle(
            { method: "GET" } as never,
            response as never,
            new URL("http://localhost/api/v1/modules/content-pack/ready"),
        );
        if (elapsed < 120_000) {
            assert.equal(error, null);
            assert.deepEqual(failures, []);
            assert.equal(handled, true);
        } else {
            assert.match(
                error?.message ?? "",
                /bootstrap timed out after 120000ms/,
            );
            assert.deepEqual(failures, ["content-pack"]);
            assert.equal(handled, false);
        }
    });
}
