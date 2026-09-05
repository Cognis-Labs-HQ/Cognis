import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { contentEntryId, inspectContentPack } from "../content-pack.js";

async function writeJson(file: string, value: unknown): Promise<void> {
    await writeFile(file, JSON.stringify(value), "utf8");
}

test("declarative language packs are inspected deterministically", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "letters"), { recursive: true });
    await mkdir(path.join(root, "content", "words"), { recursive: true });
    await mkdir(path.join(root, "assets", "strokes"), { recursive: true });
    await writeFile(path.join(root, "assets", "strokes", "a.svg"), "<svg/>");
    const manifest = {
        id: "english-core",
        publisher: "Cognis Labs HQ",
        version: "1.0.0",
        contentRevision: "2026-09-05",
        namespace: "english",
        schema: "schema.json",
        content: "content",
        assets: "assets",
        license: { id: "CC-BY-4.0" },
    };
    await writeJson(path.join(root, "manifest.json"), manifest);
    await writeJson(path.join(root, "schema.json"), {
        id: "english",
        version: 1,
        namespace: "english",
        language: "en",
        metadata: { labels: { en: "English" } },
        layers: [
            {
                id: "letters",
                metadata: { labels: { en: "Letters" } },
                semanticRole: "atomicWritingUnit",
                fields: [
                    {
                        id: "strokes",
                        metadata: { labels: { en: "Strokes" } },
                        type: "asset",
                    },
                ],
                strokeAsset: { field: "strokes", format: "svg" },
            },
            {
                id: "words",
                metadata: { labels: { en: "Words" } },
                relationships: [
                    {
                        id: "spelling",
                        metadata: { labels: { en: "Spelling" } },
                        targetLayer: "letters",
                        minimum: 1,
                        ordered: true,
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "letters", "a.json"), [
        {
            id: "english:letter:a",
            label: "a",
            fields: { strokes: "strokes/a.svg" },
        },
    ]);
    await writeJson(path.join(root, "content", "words", "a.json"), [
        {
            id: "english:word:a",
            label: "a",
            references: [
                {
                    entryId: "english:letter:a",
                    relation: "spelling",
                    position: 0,
                },
            ],
        },
    ]);

    const first = await inspectContentPack(root);
    const second = await inspectContentPack(root);
    assert.equal(first.digest, second.digest);
    assert.equal(first.records.length, 2);
    assert.deepEqual(first.assets, [
        {
            path: "strokes/a.svg",
            mediaType: "image/svg+xml",
            data: Buffer.from("<svg/>").toString("base64"),
        },
    ]);
    assert.equal(
        contentEntryId(manifest, "english:letter:a"),
        contentEntryId(manifest, "english:letter:a"),
    );

    await writeJson(path.join(root, "schema.json"), {
        ...first.schema,
        namespace: "unowned",
    });
    await assert.rejects(
        inspectContentPack(root),
        /schema_namespace_not_owned/,
    );
});

test("content packs accept complete semantic versions", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "units"), { recursive: true });
    await writeJson(path.join(root, "manifest.json"), {
        id: "versioned",
        publisher: "Test Publisher",
        namespace: "versioned",
        version: "1.2.3-beta.1+vendor.7",
        contentRevision: "1",
        schema: "schema.json",
        content: "content",
        license: { id: "CC-BY-4.0" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "versioned",
        version: 1,
        namespace: "versioned",
        language: "x-test",
        metadata: { labels: { en: "Versioned" } },
        layers: [{ id: "units", metadata: { labels: { en: "Units" } } }],
    });
    await writeJson(path.join(root, "content", "units", "data.json"), [
        { id: "versioned:unit", label: "Unit" },
    ]);

    assert.equal(
        (await inspectContentPack(root)).manifest.version,
        "1.2.3-beta.1+vendor.7",
    );
});

test("content packs reject dangling relationships", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "units"), { recursive: true });
    await writeJson(path.join(root, "manifest.json"), {
        id: "broken",
        publisher: "Test Publisher",
        version: "1.0.0",
        contentRevision: "1",
        namespace: "broken",
        schema: "schema.json",
        content: "content",
        license: { id: "test" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "broken",
        version: 1,
        namespace: "broken",
        language: "x-test",
        metadata: { labels: { en: "Broken" } },
        layers: [
            {
                id: "units",
                metadata: { labels: { en: "Units" } },
                relationships: [
                    {
                        id: "parts",
                        metadata: { labels: { en: "Parts" } },
                        targetLayer: "units",
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "units", "broken.json"), [
        {
            id: "broken:unit:a",
            label: "A",
            references: [{ entryId: "broken:unit:missing", relation: "parts" }],
        },
    ]);

    await assert.rejects(inspectContentPack(root), /reference_not_found/);
});
