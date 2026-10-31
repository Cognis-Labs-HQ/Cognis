import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ModuleMarketplaceService, type ModuleSource } from "../../../index.js";

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

const source: ModuleSource = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Shared source",
    provider: "gitlab",
    namespace: "review",
    baseUrl: "https://modules.example.test/api/v4",
};

for (const changeSource of [false, true]) {
    test(`concurrent administrator discovery ${changeSource ? "rejects a stale source revision" : "shares the pending provider scan"}`, async (t) => {
        const directory = await mkdtemp(
            path.join(tmpdir(), "cognis-shared-scan-"),
        );
        t.after(() => rm(directory, { recursive: true, force: true }));
        const started = deferred();
        const bothStarted = deferred();
        const release = deferred();
        let starts = 0;
        let requests = 0;
        const service = new ModuleMarketplaceService(
            path.join(directory, "sources.json"),
            path.join(directory, "modules"),
            (_level, message, metadata) => {
                if (
                    message === "Module source scan started." &&
                    metadata.sourceUuid === source.uuid
                ) {
                    if (++starts === 2) bothStarted.resolve();
                }
            },
        );
        await service.saveSource(source);
        const cached = {
            uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
            id: "cached-module",
            sourceUuid: source.uuid,
            cloneUrl: "https://modules.example.test/review/cached.git",
        };
        await mkdir(path.join(directory, "modules", ".cache"), {
            recursive: true,
        });
        await writeFile(
            path.join(directory, "modules", ".cache", "catalog.json"),
            JSON.stringify([cached]),
        );
        t.mock.method(globalThis, "fetch", async () => {
            requests++;
            started.resolve();
            await release.promise;
            return new Response("[]");
        });
        const first = service.discover([source.uuid], true);
        await started.promise;
        if (changeSource) {
            await service.saveSource({ ...source, name: "Updated source" });
            release.resolve();
            assert.deepEqual(await first, []);
            assert.equal(
                (await service.listCachedModules())[0].uuid,
                cached.uuid,
            );
            assert.deepEqual(await service.discover([source.uuid]), []);
            assert.deepEqual(await service.listCachedModules(), []);
            assert.equal(requests, 2);
        } else {
            const second = service.discover([source.uuid], true);
            await bothStarted.promise;
            assert.equal(requests, 1);
            release.resolve();
            assert.deepEqual(await Promise.all([first, second]), [[], []]);
            assert.deepEqual(await service.listCachedModules(), []);
            assert.equal(requests, 1);
        }
    });
}
