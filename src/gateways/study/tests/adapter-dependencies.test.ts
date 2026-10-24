import { writeAdapterFixture } from "./reuse/adapters.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
    mkdtemp,
    writeFile,
    rm,
    mkdir,
    readFile,
    copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CapabilityStore, GatewayRegistry, createCtx } from "@cognis/core";
import { CoreStudyGateway, type StudyAdapter } from "../gateway.js";

function adapter(
    id: string,
    uuid: string,
    requires: string[] = [],
): StudyAdapter {
    return {
        adapterId: id,
        adapterName: id,
        uuid,
        requires,
        isConfigured: () => true,
    };
}

test("disabled and missing manifest dependencies gate every downstream Study adapter", async () => {
    const external = new Set(["database"]);
    const gateway = new CoreStudyGateway((reference) =>
        external.has(reference),
    );
    gateway.registerAdapter(adapter("progress", "progress-uuid", ["database"]));
    gateway.registerAdapter(
        adapter("flashcards", "flashcards-uuid", ["progress-uuid"]),
    );
    assert.equal(gateway.isAdapterEnabled("flashcards"), true);
    assert.deepEqual(
        gateway.listAdapters().find(({ id }) => id === "flashcards")?.requires,
        ["progress-uuid"],
    );
    await gateway.disableAdapter("progress");
    assert.equal(gateway.isAdapterEnabled("flashcards"), false);
    await gateway.enableAdapter("progress");
    assert.equal(gateway.isAdapterEnabled("flashcards"), true);
    external.clear();
    assert.equal(gateway.isAdapterEnabled("progress"), false);
    assert.equal(gateway.isAdapterEnabled("flashcards"), false);
    gateway.registerAdapter(
        adapter("missing", "missing-uuid", ["unavailable"]),
    );
    assert.equal(gateway.isAdapterEnabled("missing"), false);
});

test("dependency cycles are unavailable instead of recursing indefinitely", () => {
    const gateway = new CoreStudyGateway();
    gateway.registerAdapter(adapter("first", "one", ["two"]));
    gateway.registerAdapter(adapter("second", "two", ["one"]));
    assert.equal(gateway.isAdapterEnabled("first"), false);
});

test("discovery loads manifest UUID dependencies and bootstrap runs them before consumers", async (context) => {
    const root = await mkdtemp(path.join(tmpdir(), "study-dependencies-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    const definitions = [
        { id: "a-consumer", uuid: "consumer", requires: ["base"] },
        { id: "z-base", uuid: "base", requires: [] },
    ];
    for (const definition of definitions)
        await writeAdapterFixture(
            root,
            {
                ...definition,
                bootstrapRequires: definition.requires.length
                    ? ["boot:z-base"]
                    : [],
            },
            "dependent",
        );
    const gateway = new CoreStudyGateway();
    await gateway.discoverAdapters(root);
    const capabilities = new CapabilityStore();
    const registered: unknown[] = [];
    await gateway.bootstrapAdapters(root, {
        gateway,
        capabilities,
        gatewayRegistry: new GatewayRegistry(),
        flow: createCtx().flow,
        registerRoute: (...args) => {
            registered.push(args);
        },
        registerStaticDir: (...args) => {
            registered.push(args);
        },
        registerCapabilityProvider: (...args) => {
            registered.push(args);
        },
        registerNavbarPlugin: (...args) => {
            registered.push(args);
        },
        registerPageExtension: (...args) => {
            registered.push(args);
        },
        log: (...args) => {
            registered.push(args);
        },
    });
    assert.equal(capabilities.get("boot:a-consumer"), true);
    assert.equal(gateway.isAdapterEnabled("a-consumer"), true);
    await gateway.disableAdapter("z-base");
    assert.equal(gateway.isAdapterEnabled("a-consumer"), false);
    assert.equal(capabilities.get("active:a-consumer"), false);
    assert.equal(capabilities.get("active:z-base"), false);
    await gateway.enableAdapter("z-base");
    assert.equal(capabilities.get("active:a-consumer"), true);
    assert.equal(capabilities.get("active:z-base"), true);
    await gateway.saveAdapterConfig("z-base", { enabled: false });
    assert.equal(capabilities.get("active:a-consumer"), false);
    await gateway.saveAdapterConfig("z-base", { enabled: true });
    assert.equal(capabilities.get("active:a-consumer"), true);
});

test("shipped Study manifests express UUID dependencies for practice and reward mechanisms", async () => {
    const manifests: Record<
        string,
        { uuid: string; requires: string[]; gateway: string }
    > = Object.fromEntries(
        await Promise.all(
            [
                "progress",
                "leaderboard",
                "drawing",
                "flashcards",
                "library",
                "classes",
            ].map(async (id) => [
                id,
                JSON.parse(
                    await readFile(
                        new URL(
                            `../../../adapters/study/${id}/manifest.json`,
                            import.meta.url,
                        ),
                        "utf8",
                    ),
                ),
            ]),
        ),
    );
    for (const id of ["drawing", "flashcards"])
        assert.deepEqual(manifests[id].requires, [
            manifests.library.uuid,
            manifests.progress.uuid,
        ]);
    assert.deepEqual(manifests.leaderboard.requires, [manifests.progress.uuid]);
    for (const manifest of Object.values(manifests)) {
        assert.equal(manifest.gateway, "study");
        assert.ok(
            manifest.requires.every((reference: string) =>
                /^[0-9a-f-]{36}$/.test(reference),
            ),
        );
    }
});

test("required core capabilities participate in Study adapter availability", () => {
    const capabilities = new Set(["engagement:ledger"]);
    const gateway = new CoreStudyGateway(
        () => false,
        (reference) => capabilities.has(reference),
    );
    gateway.registerAdapter({
        ...adapter("progress", "progress-uuid"),
        requiresCapabilities: ["engagement:ledger"],
    });
    assert.equal(gateway.isAdapterEnabled("progress"), true);
    capabilities.clear();
    assert.equal(gateway.isAdapterEnabled("progress"), false);
});
