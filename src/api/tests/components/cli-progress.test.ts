import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createComponentRoutes } from "../../routes/components/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import type { ComponentService } from "../../components/service.js";

test(
    "real CLI receives progress before completion, separates streams and honors verbose and failed exits",
    { timeout: 30_000 },
    async (context) => {
        const directory = await mkdtemp(
            path.join(os.tmpdir(), "cognis-cli-progress-"),
        );
        const tokenPath = path.join(directory, "token");
        await writeFile(tokenPath, "fixture-token");
        context.after(() => rm(directory, { recursive: true, force: true }));
        let release!: () => void;
        let failed = false;
        const routeContext = createDefaultRouteContext();
        routeContext.requireAuth = (request, response) => {
            if (request.headers.authorization !== "Bearer fixture-token") {
                response.writeHead(401);
                response.end();
                return null;
            }
            return { sub: "fixture", role: "admin" };
        };
        const service = {
            async apply(_request, _input, options) {
                const target = { type: "module", id: "example" };
                options?.onProgress?.({
                    phase: "installing",
                    target,
                    channel: "main",
                });
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
                return {
                    results: [
                        {
                            target,
                            status: failed ? "failed" : "succeeded",
                            ...(failed
                                ? { code: "component_upgrade_timeout" }
                                : {
                                      data: {
                                          id: "example",
                                          version: "2.0.0",
                                          restartRequired: true,
                                          files: [
                                              {
                                                  path: "internal-manifest-detail.js",
                                              },
                                          ],
                                      },
                                  }),
                        },
                    ],
                };
            },
        } as ComponentService;
        const route = createComponentRoutes(
            service,
            async () => ({}),
            routeContext,
            () => {},
        );
        const server = http.createServer(async (request, response) => {
            const url = new URL(request.url!, "http://test");
            if (await route(request, response, url)) return;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ data: [] }));
        });
        await new Promise<void>((resolve) =>
            server.listen(0, "127.0.0.1", resolve),
        );
        context.after(
            () => new Promise<void>((resolve) => server.close(() => resolve())),
        );
        const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        for (const args of [
            ["component:upgrade", "module", "example"],
            ["-v", "component:upgrade", "module", "example"],
            ["component:upgrade", "module", "example", "-v"],
        ]) {
            let stdout = "",
                stderr = "";
            const progress = Promise.withResolvers<void>();
            const child = spawn(
                process.execPath,
                ["--import", "tsx", "src/tooling/cli/index.ts", ...args],
                {
                    env: {
                        ...process.env,
                        COGNIS_API_URL: base,
                        COGNIS_CLI_TOKEN_PATH: tokenPath,
                    },
                    stdio: ["ignore", "pipe", "pipe"],
                },
            );
            context.after(() => {
                release?.();
                child.kill();
            });
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
                if (stderr.includes("Installing selected release"))
                    progress.resolve();
            });
            const completed = new Promise<number | null>((resolve, reject) => {
                child.once("error", reject);
                child.once("exit", resolve);
            });
            await Promise.race([
                progress.promise,
                completed.then(() => {
                    throw new Error(`CLI exited before progress: ${stderr}`);
                }),
            ]);
            assert.equal(stdout, "", "progress must precede the final result");
            release();
            assert.equal(await completed, failed ? 1 : 0);
            assert.match(
                stderr,
                /module example: Installing selected release \(main\)/,
            );
            if (args.includes("-v")) {
                assert.equal(
                    JSON.parse(stdout).data.results[0].status,
                    failed ? "failed" : "succeeded",
                );
            } else {
                assert.match(
                    stdout,
                    /module example: succeeded.*Version 2.0.0.*Restart Cognis/,
                );
                assert.doesNotMatch(stdout, /internal-manifest-detail/);
            }
            failed = args[0] === "-v";
        }
    },
);
