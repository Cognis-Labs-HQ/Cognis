import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { NamespaceFileClient } from "@cognis/core";
import { InMemoryTestExecutor } from "../../../../../gateways/db/tests/in-memory-test-executor.js";
import { LibraryImageStore } from "../../image-store.js";
import { LibraryStore } from "../../store.js";
import { contentEntryId } from "../../content-pack.js";
import type { LibraryContentPackPlan } from "../../types.js";

test("saved reference images remain readable after store recreation and provider reload", async (t) => {
    const root = await mkdtemp(join(tmpdir(), "study-images-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const files = (): NamespaceFileClient =>
        ({
            async put(_actor, key, data) {
                const path = join(root, key);
                await mkdir(dirname(path), { recursive: true });
                await writeFile(path, data);
                return { key, size: data.byteLength, lastModified: new Date() };
            },
            async get(_actor, key) {
                return readFile(join(root, key));
            },
        }) as NamespaceFileClient;
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
    const upload = await new LibraryImageStore(files()).upload(
        { accountId: "alice", role: "user" },
        "image/png",
        png,
    );
    const database = new InMemoryTestExecutor();
    let store = new LibraryStore(database);
    await store.ensureSchema();
    const plan: LibraryContentPackPlan = {
        root: "/content",
        digest: "first",
        manifest: {
            id: "images",
            publisher: "test",
            version: "1.0.0",
            namespace: "en",
            schema: "schema.json",
            content: "data",
            license: { id: "CC0-1.0" },
        },
        schema: {
            id: "images",
            version: 1,
            namespace: "en",
            language: "en",
            layers: [
                {
                    id: "words",
                    fields: [
                        {
                            id: "pictures",
                            type: "imageList",
                            input: { control: "imageFiles" },
                        },
                    ],
                },
            ],
        },
        records: [
            {
                id: "dog",
                layer: "words",
                label: "Dog",
                fields: { pictures: [] },
            },
        ],
        assets: [],
    };
    await store.ingestContentPack(plan);
    const id = contentEntryId(plan.manifest, "dog");
    await store.update(
        id,
        {
            schemaId: "images",
            schemaVersion: 1,
            layer: "words",
            label: "Dog",
            fields: { pictures: [upload.value] },
        },
        true,
    );
    store = new LibraryStore(database);
    await store.ensureSchema();
    for (const next of [
        plan,
        {
            ...plan,
            digest: "second",
            manifest: { ...plan.manifest, version: "1.0.1" },
        },
    ]) {
        await store.ingestContentPack(next);
        const entry = await store.get(id);
        assert.deepEqual(entry?.fields?.pictures, [upload.value]);
        assert.equal(await store.hasImageReference(upload.value), true);
        const image = await new LibraryImageStore(files()).read(upload.value);
        assert.equal(image.mediaType, "image/png");
        assert.deepEqual(image.data, png);
    }
});
