import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { copyFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    createCtx,
    requireBootstrapScope,
    type BootstrapScope,
    type ModuleManifest,
} from "@cognis/core";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

function gate() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

async function fixture(
    t: TestContext,
    work: (scope: BootstrapScope) => Promise<void>,
) {
    const root = createCtx();
    const directory = await mkdtemp(
        path.join(tmpdir(), "cognis-bootstrap-authority-"),
    );
    const uuid = "16359445-87eb-4ceb-82b1-98db4fb21301";
    const moduleRoot = path.join(directory, uuid);
    await mkdir(moduleRoot);
    await copyFile(
        new URL("./fixtures/bootstrap-scope/bootstrap.mjs", import.meta.url),
        path.join(moduleRoot, "bootstrap.mjs"),
    );
    const previous = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = directory;
    t.after(async () => {
        if (previous === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previous;
        await rm(directory, { recursive: true, force: true });
    });
    root.contributePublicCapability("fixture:bootstrap", () =>
        work(requireBootstrapScope(root)),
    );
    let enabled = true;
    const extension = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "scope-plugin",
                    uuid,
                    version: "1.0.0",
                    entrypoints: { bootstrap: "./bootstrap.mjs" },
                } as ModuleManifest,
            ],
        } as never,
        () => enabled,
        undefined,
        {
            bootstrapTimeoutMs: 50,
            routeContext: createDefaultRouteContext({
                getCapability: <T>(id: string) =>
                    (id === "system:ctx" ? root : undefined) as T | undefined,
                flow: root.flow,
            }),
        },
    );
    return {
        root,
        extension,
        disable: async () => {
            enabled = false;
            await extension.refresh();
        },
    };
}

for (const fail of [false, true]) {
    test(`module bootstrap exposes revocable host authority and owns disposal (fail=${fail})`, async (t) => {
        const events: string[] = [];
        const host = await fixture(t, async (scope) => {
            events.push(scope.owner);
            scope.registerDisposer(() => {
                events.push("dispose");
            });
            if (fail) throw new Error("bootstrap_failed");
        });
        if (fail)
            await assert.rejects(
                host.extension.refresh({ throwOnFailure: true }),
                /bootstrap_failed/,
            );
        else await host.extension.refresh({ throwOnFailure: true });
        assert.equal(events[0], "module:scope-plugin");
        assert.throws(
            () => requireBootstrapScope(host.root),
            /bootstrap_registration_closed/,
        );
        if (!fail) await host.disable();
        assert.deepEqual(events, ["module:scope-plugin", "dispose"]);
    });
}

test("timed-out module bootstrap revokes authority before its detached work finishes", async (t) => {
    const entered = gate();
    const release = gate();
    let late!: Promise<void>;
    let disposed = false;
    const host = await fixture(t, async (scope) => {
        scope.registerDisposer(() => {
            disposed = true;
        });
        late = release.promise.then(() => {
            assert.throws(
                () => requireBootstrapScope(host.root),
                /bootstrap_registration_closed/,
            );
        });
        entered.resolve();
        await late;
    });
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const outcome = assert.rejects(
        host.extension.refresh({ throwOnFailure: true }),
        /timed out/,
    );
    await entered.promise;
    t.mock.timers.tick(51);
    await outcome;
    assert.equal(disposed, true);
    release.resolve();
    await late;
});
