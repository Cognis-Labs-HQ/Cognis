import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { structuredStore } from "../../../../../gateways/reuse/tests/structured-store.js";
import { LibraryStore } from "../../store.js";
import { inspectContentPack } from "../../content-pack.js";

test("pack assets retain exact bytes, Unicode paths and version isolation in bounded keyed rows", async () => {
    const fixture = structuredStore();
    const store = new LibraryStore(fixture.db);
    await store.ensureSchema();
    const plan = await inspectContentPack(
        fileURLToPath(new URL("../fixtures/external-pack/", import.meta.url)),
    );
    const bytes = Buffer.from("画像𠮷".repeat(40000));
    const assetPath = "images/猫𠮷.png";
    plan.assets = [
        {
            path: assetPath,
            mediaType: "image/png",
            data: bytes.toString("base64"),
        },
    ];
    await store.ingestContentPack(plan);
    const recreated = new LibraryStore(fixture.db);
    const read = () =>
        recreated.getContentPackAsset(
            plan.manifest.publisher,
            plan.manifest.id,
            plan.manifest.version,
            assetPath,
        );
    assert.deepEqual(await read(), { mediaType: "image/png", data: bytes });
    assert.equal(
        await recreated.getContentPackAsset(
            plan.manifest.publisher,
            plan.manifest.id,
            "9.9.9",
            assetPath,
        ),
        null,
    );
    assert.ok(fixture.rows("study_library_asset_chunks").length > 2);
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_asset_chunks" &&
            command.values.position === 1,
    );
    await assert.rejects(
        store.ingestContentPack({
            ...plan,
            assets: [
                {
                    ...plan.assets[0],
                    data: Buffer.from("changed".repeat(60000)).toString(
                        "base64",
                    ),
                },
            ],
        }),
        /storage_failed/,
    );
    fixture.fail(() => false);
    assert.deepEqual(await read(), { mediaType: "image/png", data: bytes });
    await store.ingestContentPack({
        ...plan,
        assets: [
            {
                ...plan.assets[0],
                data: Buffer.from("small").toString("base64"),
            },
        ],
    });
    assert.deepEqual((await read())?.data, Buffer.from("small"));
    assert.equal(fixture.rows("study_library_asset_chunks").length, 1);
    const other = {
        ...plan,
        manifest: {
            ...plan.manifest,
            id: "another-pack",
            namespace: plan.schema.namespace,
        },
    };
    await store.ingestContentPack(other);
    await store.forgetContentPack(plan.manifest.publisher, plan.manifest.id);
    assert.equal(await read(), null);
    assert.deepEqual(
        (
            await recreated.getContentPackAsset(
                other.manifest.publisher,
                other.manifest.id,
                other.manifest.version,
                assetPath,
            )
        )?.data,
        bytes,
    );
});
